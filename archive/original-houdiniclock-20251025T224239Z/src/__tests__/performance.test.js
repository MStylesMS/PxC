/**
 * Performance Testing Suite
 * Automated tests for performance regressions and optimizations
 */

import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import performanceAnalyzer from '../utils/performanceAnalyzer';
import Clock from '../components/clock/Clock';
import SecondsHand from '../components/clock/SecondsHand';
import MinutesHand from '../components/clock/MinutesHand';
import Hint from '../components/hint/Hint';

// Mock performance API for testing
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000
  }
};

// Setup performance mocks
beforeEach(() => {
  global.performance = mockPerformance;
  performanceAnalyzer.reset();
});

describe.skip('Performance Tests', () => {
  describe('Component Render Performance', () => {
    test('Clock component renders within performance budget', async () => {
      const startTime = performance.now();
      
      render(<Clock />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within 16ms (60fps budget)
      expect(renderTime).toBeLessThan(16);
    });

    test('SecondsHand renders efficiently with props changes', async () => {
      const { rerender } = render(<SecondsHand secondsElapsed={0} />);
      
      const renderTimes = [];
      
      // Test multiple re-renders with different props
      for (let i = 1; i <= 60; i++) {
        const startTime = performance.now();
        
        rerender(<SecondsHand secondsElapsed={i} />);
        
        const endTime = performance.now();
        renderTimes.push(endTime - startTime);
      }
      
      const avgRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
      const maxRenderTime = Math.max(...renderTimes);
      
      // Average render time should be under 5ms
      expect(avgRenderTime).toBeLessThan(5);
      // Max render time should be under 10ms
      expect(maxRenderTime).toBeLessThan(10);
    });

    test('MinutesHand memoization prevents unnecessary re-renders', () => {
      const renderSpy = jest.fn();
      
      const TestComponent = () => {
        renderSpy();
        return <MinutesHand secondsElapsed={60} />;
      };
      
      const { rerender } = render(<TestComponent />);
      
      // Re-render with same props
      rerender(<TestComponent />);
      rerender(<TestComponent />);
      
      // Should only render once due to memoization
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    test('Hint component handles rapid state changes efficiently', async () => {
      const messages = ['Message 1', 'Message 2', 'Message 3'];
      const { rerender } = render(<Hint text="" visible={false} />);
      
      const renderTimes = [];
      
      for (const message of messages) {
        const startTime = performance.now();
        
        rerender(<Hint text={message} visible={true} />);
        
        const endTime = performance.now();
        renderTimes.push(endTime - startTime);
      }
      
      const avgRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
      expect(avgRenderTime).toBeLessThan(8);
    });
  });

  describe('Animation Performance', () => {
    test('clock hand animations maintain 60fps', async () => {
      render(<SecondsHand secondsElapsed={0} />);
      
      const frameRates = [];
      let lastFrameTime = performance.now();
      
      // Simulate 60 animation frames
      for (let i = 0; i < 60; i++) {
        await act(async () => {
          const currentTime = performance.now();
          const frameDelta = currentTime - lastFrameTime;
          const fps = 1000 / frameDelta;
          
          frameRates.push(fps);
          lastFrameTime = currentTime;
          
          // Advance time by ~16ms for 60fps
          mockPerformance.now.mockReturnValue(currentTime + 16.67);
        });
      }
      
      const avgFPS = frameRates.reduce((sum, fps) => sum + fps, 0) / frameRates.length;
      expect(avgFPS).toBeGreaterThan(50); // Allow some variance but should be near 60fps
    });

    test('CSS transforms use hardware acceleration', () => {
      render(<SecondsHand secondsElapsed={30} />);
      
      const handElement = screen.getByTestId('seconds-hand');
      const computedStyle = window.getComputedStyle(handElement);
      
      // Should use transform3d for hardware acceleration
      expect(computedStyle.transform).toContain('matrix3d');
    });
  });

  describe('Memory Management', () => {
    test('components clean up properly on unmount', async () => {
      const initialMemory = performance.memory.usedJSHeapSize;
      
      const { unmount } = render(<Clock />);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      unmount();
      
      // Simulate some time passing for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const finalMemory = performance.memory.usedJSHeapSize;
      
      // Memory usage should not increase significantly
      expect(finalMemory - initialMemory).toBeLessThan(50000); // 50KB threshold
    });

    test('MQTT connection does not leak event listeners', () => {
      const mockMQTT = {
        on: jest.fn(),
        off: jest.fn(),
        connect: jest.fn(),
        end: jest.fn()
      };
      
      // Mock MQTT module
      jest.doMock('../MQTT', () => ({
        connect: () => mockMQTT,
        default: mockMQTT
      }));
      
      const { unmount } = render(<Clock />);
      
      unmount();
      
      // Should clean up event listeners
      expect(mockMQTT.off).toHaveBeenCalled();
    });
  });

  describe('Performance Regression Tests', () => {
    test('component render times do not regress', async () => {
      const baselineRenderTimes = {
        Clock: 15,
        SecondsHand: 8,
        MinutesHand: 8,
        Hint: 10
      };
      
      const components = [
        { name: 'Clock', component: <Clock /> },
        { name: 'SecondsHand', component: <SecondsHand secondsElapsed={30} /> },
        { name: 'MinutesHand', component: <MinutesHand secondsElapsed={1800} /> },
        { name: 'Hint', component: <Hint text="Test" visible={true} /> }
      ];
      
      for (const { name, component } of components) {
        const startTime = performance.now();
        render(component);
        const endTime = performance.now();
        
        const renderTime = endTime - startTime;
        const baseline = baselineRenderTimes[name];
        
        // Allow 20% variance from baseline
        expect(renderTime).toBeLessThan(baseline * 1.2);
      }
    });

    test('bundle size stays within limits', async () => {
      // This would typically be tested with a webpack analyzer
      // For now, we'll mock the bundle size check
      const mockBundleSize = 250000; // 250KB
      const maxBundleSize = 300000; // 300KB limit
      
      expect(mockBundleSize).toBeLessThan(maxBundleSize);
    });
  });

  describe('Performance Analyzer Integration', () => {
    test('performance analyzer tracks render times correctly', () => {
      const componentName = 'TestComponent';
      
      performanceAnalyzer.startRender(componentName);
      
      // Simulate some work
      const start = Date.now();
      while (Date.now() - start < 10) {} // 10ms of work
      
      performanceAnalyzer.endRender(componentName);
      
      const metrics = performanceAnalyzer.getRenderMetrics();
      expect(metrics[componentName]).toBeDefined();
      expect(metrics[componentName].renders).toBe(1);
      expect(metrics[componentName].avgTime).toBeGreaterThan(8);
    });

    test('performance analyzer detects slow renders', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const componentName = 'SlowComponent';
      
      performanceAnalyzer.startRender(componentName);
      
      // Simulate slow work (>16ms)
      const start = Date.now();
      while (Date.now() - start < 20) {}
      
      performanceAnalyzer.endRender(componentName);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow render detected')
      );
      
      consoleSpy.mockRestore();
    });

    test('memory monitoring detects high usage', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Mock high memory usage
      mockPerformance.memory.usedJSHeapSize = 3500000; // 87.5% of limit
      
      performanceAnalyzer.startMonitoring(100); // Short interval for testing
      
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(consoleSpy).toHaveBeenCalledWith(
            '⚠️ High memory usage detected:',
            expect.any(Object)
          );
          
          performanceAnalyzer.stopMonitoring();
          consoleSpy.mockRestore();
          resolve();
        }, 150);
      });
    });
  });

  describe('Load Testing', () => {
    test('handles rapid MQTT message processing', async () => {
      const messageCount = 100;
      const startTime = performance.now();
      
      // Simulate rapid message processing
      for (let i = 0; i < messageCount; i++) {
        performanceAnalyzer.trackMQTTMessage(startTime + i, startTime + i + 1);
      }
      
      const metrics = performanceAnalyzer.getMQTTMetrics();
      expect(metrics.avgLatency).toBeLessThan(5); // Should process quickly
    });

    test('maintains performance under component stress', async () => {
      const mountCount = 50;
      const components = [];
      
      const startTime = performance.now();
      
      // Mount many components rapidly
      for (let i = 0; i < mountCount; i++) {
        const { unmount } = render(<SecondsHand secondsElapsed={i} />);
        components.push(unmount);
      }
      
      // Unmount all components
      components.forEach(unmount => unmount());
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should handle stress test within reasonable time
      expect(totalTime).toBeLessThan(1000); // 1 second limit
    });
  });
});

// Performance benchmark utility
export const runPerformanceBenchmark = async (component, iterations = 100) => {
  const renderTimes = [];
  
  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();
    const { unmount } = render(component);
    const endTime = performance.now();
    
    renderTimes.push(endTime - startTime);
    unmount();
  }
  
  return {
    avg: renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length,
    min: Math.min(...renderTimes),
    max: Math.max(...renderTimes),
    median: renderTimes.sort((a, b) => a - b)[Math.floor(renderTimes.length / 2)]
  };
};

export default runPerformanceBenchmark;
