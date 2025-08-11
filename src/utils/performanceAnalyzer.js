/**
 * Performance Analysis Utilities
 * Comprehensive performance monitoring for React components and app metrics
 */

class PerformanceAnalyzer {
  constructor() {
    this.metrics = new Map();
    this.renderTimes = new Map();
    this.componentMounts = new Map();
    this.mqttMetrics = {
      connectionTime: 0,
      messageLatency: [],
      reconnections: 0,
      errors: 0
    };
  }

  // React Component Performance
  startRender(componentName) {
    const startTime = performance.now();
    this.metrics.set(`${componentName}_render_start`, startTime);
    return startTime;
  }

  endRender(componentName) {
    const endTime = performance.now();
    const startTime = this.metrics.get(`${componentName}_render_start`);
    
    if (startTime) {
      const renderTime = endTime - startTime;
      
      if (!this.renderTimes.has(componentName)) {
        this.renderTimes.set(componentName, []);
      }
      
      this.renderTimes.get(componentName).push(renderTime);
      this.metrics.set(`${componentName}_last_render`, renderTime);
      
      // Log slow renders
      if (renderTime > 16) { // > 1 frame at 60fps
        console.warn(`⚠️ Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`);
      }
    }
    
    return endTime;
  }

  // Component Mount Tracking
  trackMount(componentName) {
    const mountTime = performance.now();
    this.componentMounts.set(componentName, mountTime);
    console.log(`🚀 ${componentName} mounted at ${mountTime.toFixed(2)}ms`);
  }

  trackUnmount(componentName) {
    const unmountTime = performance.now();
    const mountTime = this.componentMounts.get(componentName);
    
    if (mountTime) {
      const lifetime = unmountTime - mountTime;
      console.log(`💀 ${componentName} unmounted after ${lifetime.toFixed(2)}ms lifetime`);
    }
  }

  // MQTT Performance
  trackMQTTConnection(startTime, endTime) {
    this.mqttMetrics.connectionTime = endTime - startTime;
    console.log(`🔌 MQTT connected in ${this.mqttMetrics.connectionTime.toFixed(2)}ms`);
  }

  trackMQTTMessage(messageTime, processTime) {
    const latency = processTime - messageTime;
    this.mqttMetrics.messageLatency.push(latency);
    
    // Keep only last 100 measurements
    if (this.mqttMetrics.messageLatency.length > 100) {
      this.mqttMetrics.messageLatency.shift();
    }
  }

  trackMQTTReconnection() {
    this.mqttMetrics.reconnections++;
    console.warn(`🔄 MQTT reconnection #${this.mqttMetrics.reconnections}`);
  }

  trackMQTTError() {
    this.mqttMetrics.errors++;
    console.error(`❌ MQTT error #${this.mqttMetrics.errors}`);
  }

  // Animation Performance
  trackAnimationFrame(animationName) {
    const frameTime = performance.now();
    const lastFrame = this.metrics.get(`${animationName}_last_frame`);
    
    if (lastFrame) {
      const frameDelta = frameTime - lastFrame;
      const fps = 1000 / frameDelta;
      
      if (fps < 50) { // Below 50fps is concerning
        console.warn(`🎞️ Animation ${animationName} running at ${fps.toFixed(1)}fps`);
      }
    }
    
    this.metrics.set(`${animationName}_last_frame`, frameTime);
  }

  // Memory Monitoring
  getMemoryUsage() {
    if (performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(performance.memory.totalJSHeapSize / 1048576), // MB
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) // MB
      };
    }
    return null;
  }

  // Performance Report Generation
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      renderMetrics: this.getRenderMetrics(),
      mqttMetrics: this.getMQTTMetrics(),
      memoryUsage: this.getMemoryUsage(),
      vitals: this.getWebVitals()
    };

    console.group('📊 Performance Report');
    console.table(report.renderMetrics);
    console.log('MQTT Metrics:', report.mqttMetrics);
    console.log('Memory Usage:', report.memoryUsage);
    console.log('Web Vitals:', report.vitals);
    console.groupEnd();

    return report;
  }

  getRenderMetrics() {
    const metrics = {};
    
    for (const [component, times] of this.renderTimes.entries()) {
      if (times.length > 0) {
        metrics[component] = {
          renders: times.length,
          avgTime: times.reduce((sum, time) => sum + time, 0) / times.length,
          maxTime: Math.max(...times),
          minTime: Math.min(...times)
        };
      }
    }
    
    return metrics;
  }

  getMQTTMetrics() {
    const latencies = this.mqttMetrics.messageLatency;
    
    return {
      connectionTime: this.mqttMetrics.connectionTime,
      avgLatency: latencies.length > 0 
        ? latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length 
        : 0,
      maxLatency: latencies.length > 0 ? Math.max(...latencies) : 0,
      minLatency: latencies.length > 0 ? Math.min(...latencies) : 0,
      reconnections: this.mqttMetrics.reconnections,
      errors: this.mqttMetrics.errors
    };
  }

  getWebVitals() {
    return new Promise((resolve) => {
      // Use Web Vitals library if available
      if (window.webVitals) {
        const vitals = {};
        
        window.webVitals.getCLS(metric => vitals.cls = metric.value);
        window.webVitals.getFID(metric => vitals.fid = metric.value);
        window.webVitals.getFCP(metric => vitals.fcp = metric.value);
        window.webVitals.getLCP(metric => vitals.lcp = metric.value);
        window.webVitals.getTTFB(metric => vitals.ttfb = metric.value);
        
        setTimeout(() => resolve(vitals), 100);
      } else {
        resolve({});
      }
    });
  }

  // React DevTools Integration
  enableReactProfiling() {
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot = (id, root) => {
        const fiberRoot = root.current;
        this.analyzeReactTree(fiberRoot);
      };
    }
  }

  analyzeReactTree(fiber) {
    if (!fiber) return;
    
    // Analyze component tree for performance issues
    if (fiber.actualDuration > 16) {
      console.warn(`🐌 Slow React component: ${fiber.type?.name || 'Unknown'} - ${fiber.actualDuration.toFixed(2)}ms`);
    }
    
    // Recursively analyze children
    let child = fiber.child;
    while (child) {
      this.analyzeReactTree(child);
      child = child.sibling;
    }
  }

  // Automated Performance Monitoring
  startMonitoring(interval = 5000) {
    this.monitoringInterval = setInterval(() => {
      const memory = this.getMemoryUsage();
      
      if (memory && memory.used > memory.limit * 0.8) {
        console.warn('⚠️ High memory usage detected:', memory);
      }
      
      // Auto-generate report every minute
      if (Date.now() % 60000 < interval) {
        this.generateReport();
      }
    }, interval);
    
    console.log('🎯 Performance monitoring started');
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('⏹️ Performance monitoring stopped');
    }
  }

  // Export data for external analysis
  exportData() {
    return {
      metrics: Object.fromEntries(this.metrics),
      renderTimes: Object.fromEntries(this.renderTimes),
      componentMounts: Object.fromEntries(this.componentMounts),
      mqttMetrics: this.mqttMetrics,
      timestamp: Date.now()
    };
  }

  // Clear all collected data
  reset() {
    this.metrics.clear();
    this.renderTimes.clear();
    this.componentMounts.clear();
    this.mqttMetrics = {
      connectionTime: 0,
      messageLatency: [],
      reconnections: 0,
      errors: 0
    };
    console.log('🔄 Performance data reset');
  }
}

// Singleton instance
const performanceAnalyzer = new PerformanceAnalyzer();

// React Hook for component performance tracking
export const usePerformanceTracker = (componentName) => {
  const React = require('react');
  
  React.useEffect(() => {
    performanceAnalyzer.trackMount(componentName);
    
    return () => {
      performanceAnalyzer.trackUnmount(componentName);
    };
  }, [componentName]);

  return {
    startRender: () => performanceAnalyzer.startRender(componentName),
    endRender: () => performanceAnalyzer.endRender(componentName)
  };
};

// Higher-order component for automatic performance tracking
export const withPerformanceTracking = (WrappedComponent) => {
  const componentName = WrappedComponent.displayName || WrappedComponent.name || 'Unknown';
  
  return React.memo((props) => {
    const { startRender, endRender } = usePerformanceTracker(componentName);
    
    React.useLayoutEffect(() => {
      startRender();
      return endRender;
    });
    
    return React.createElement(WrappedComponent, props);
  });
};

export default performanceAnalyzer;
