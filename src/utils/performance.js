// Performance utilities for the Houdini Clock application

/**
 * Debounce function to limit the rate of function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Whether to execute immediately
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait, immediate = false) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
};

/**
 * Throttle function to limit the frequency of function execution
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Memoization function for expensive calculations
 * @param {Function} fn - Function to memoize
 * @param {Function} getKey - Function to generate cache key
 * @returns {Function} Memoized function
 */
export const memoize = (fn, getKey = (...args) => JSON.stringify(args)) => {
  const cache = new Map();
  return function(...args) {
    const key = getKey(...args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
};

/**
 * Performance monitor for measuring render times
 */
export class PerformanceMonitor {
  constructor(name) {
    this.name = name;
    this.measurements = [];
  }

  start() {
    this.startTime = performance.now();
  }

  end() {
    if (this.startTime) {
      const duration = performance.now() - this.startTime;
      this.measurements.push(duration);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`${this.name}: ${duration.toFixed(2)}ms`);
      }
      
      this.startTime = null;
      return duration;
    }
  }

  getAverageTime() {
    if (this.measurements.length === 0) return 0;
    return this.measurements.reduce((sum, time) => sum + time, 0) / this.measurements.length;
  }

  reset() {
    this.measurements = [];
  }
}

/**
 * Check if the browser supports modern features
 */
export const browserSupport = {
  intersectionObserver: 'IntersectionObserver' in window,
  webGL: (() => {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  })(),
  webWorkers: 'Worker' in window,
  localStorage: (() => {
    try {
      const test = 'test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  })(),
  webSocket: 'WebSocket' in window
};

/**
 * Optimize image loading with lazy loading support
 * @param {string} src - Image source URL
 * @param {Object} options - Lazy loading options
 * @returns {Promise} Promise that resolves when image is loaded
 */
export const optimizedImageLoader = (src, options = {}) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    if (options.lazy && browserSupport.intersectionObserver) {
      // Implement lazy loading
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            img.src = src;
            observer.unobserve(entry.target);
          }
        });
      });
      
      observer.observe(img);
    } else {
      img.src = src;
    }
    
    img.onload = () => resolve(img);
    img.onerror = reject;
  });
};

/**
 * Memory usage monitoring
 */
export const memoryMonitor = {
  getUsage() {
    if ('memory' in performance) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  },

  log() {
    const usage = this.getUsage();
    if (usage && process.env.NODE_ENV === 'development') {
      console.log('Memory Usage:', {
        used: `${(usage.used / 1048576).toFixed(2)} MB`,
        total: `${(usage.total / 1048576).toFixed(2)} MB`,
        limit: `${(usage.limit / 1048576).toFixed(2)} MB`
      });
    }
  }
};

/**
 * Frame rate monitor for animation performance
 */
export class FrameRateMonitor {
  constructor() {
    this.frames = [];
    this.lastTime = performance.now();
    this.isMonitoring = false;
  }

  start() {
    this.isMonitoring = true;
    this.lastTime = performance.now();
    this.tick();
  }

  stop() {
    this.isMonitoring = false;
  }

  tick() {
    if (!this.isMonitoring) return;

    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;

    const fps = 1000 / delta;
    this.frames.push(fps);

    // Keep only last 60 frames
    if (this.frames.length > 60) {
      this.frames.shift();
    }

    requestAnimationFrame(() => this.tick());
  }

  getAverageFPS() {
    if (this.frames.length === 0) return 0;
    return this.frames.reduce((sum, fps) => sum + fps, 0) / this.frames.length;
  }

  getCurrentFPS() {
    return this.frames[this.frames.length - 1] || 0;
  }
}

/**
 * Bundle size analyzer helper
 */
export const bundleAnalyzer = {
  logChunkSizes() {
    if (process.env.NODE_ENV === 'development') {
      // This would be more useful in a webpack plugin, but can help during development
      console.log('Bundle analysis - use npm run build:analyze for detailed report');
    }
  }
};

/**
 * Component render optimization helpers
 */
export const renderOptimization = {
  /**
   * Check if props have actually changed (shallow comparison)
   */
  propsChanged(prevProps, nextProps) {
    const prevKeys = Object.keys(prevProps);
    const nextKeys = Object.keys(nextProps);
    
    if (prevKeys.length !== nextKeys.length) {
      return true;
    }
    
    return prevKeys.some(key => prevProps[key] !== nextProps[key]);
  },

  /**
   * Create a stable key for React.memo or useMemo dependencies
   */
  createStableKey(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    
    return Object.keys(obj)
      .sort()
      .reduce((result, key) => {
        result[key] = obj[key];
        return result;
      }, {});
  }
};

// Export performance monitoring instance for global use
export const globalPerformanceMonitor = new PerformanceMonitor('Global');
export const globalFrameRateMonitor = new FrameRateMonitor();

// Auto-start frame rate monitoring in development
if (process.env.NODE_ENV === 'development') {
  globalFrameRateMonitor.start();
  
  // Log performance stats every 5 seconds
  setInterval(() => {
    memoryMonitor.log();
    console.log(`Average FPS: ${globalFrameRateMonitor.getAverageFPS().toFixed(2)}`);
  }, 5000);
}
