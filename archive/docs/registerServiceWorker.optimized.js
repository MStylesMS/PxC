// Archived: Enhanced Service Worker Registration with Performance Optimizations
// (moved from src/registerServiceWorker.optimized.js)

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(
    /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
  )
);

export default function register() {
  if ('serviceWorker' in navigator) {
    const publicUrl = new URL(process.env.PUBLIC_URL, window.location);
    if (publicUrl.origin !== window.location.origin) {
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

      if (isLocalhost) {
        checkValidServiceWorker(swUrl);
        navigator.serviceWorker.ready.then(() => {
          console.log(
            'This web app is being served cache-first by a service ' +
            'worker. To learn more, visit https://goo.gl/SC7cgQ'
          );
        });
      } else {
        registerValidSW(swUrl);
      }
    });
  }
}

function registerValidSW(swUrl) {
  navigator.serviceWorker
    .register(swUrl)
    .then(registration => {
      console.log('SW registered: ', registration);
      
      // Check for updates every 60 seconds
      setInterval(() => {
        registration.update();
      }, 60000);
      
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              console.log('New content is available; please refresh.');
              // Show update notification to user
              showUpdateNotification();
            } else {
              console.log('Content is cached for offline use.');
            }
          }
        };
      };
    })
    .catch(error => {
      console.error('Error during service worker registration:', error);
    });
}

function checkValidServiceWorker(swUrl) {
  fetch(swUrl)
    .then(response => {
      if (
        response.status === 404 ||
        response.headers.get('content-type').indexOf('javascript') === -1
      ) {
        navigator.serviceWorker.ready.then(registration => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        registerValidSW(swUrl);
      }
    })
    .catch(() => {
      console.log(
        'No internet connection found. App is running in offline mode.'
      );
    });
}

function showUpdateNotification() {
  // Create a simple update notification
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Houdini Clock Update Available', {
      body: 'A new version is available. Please refresh the page.',
      icon: '/favicon.ico',
      tag: 'update-notification'
    });
  } else {
    // Fallback to console log or custom UI notification
    console.log('Update available - please refresh the page');
  }
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.unregister();
    });
  }
}

// Performance monitoring and optimization
export function enablePerformanceMonitoring() {
  if ('performance' in window) {
    // Monitor key performance metrics
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        const paintEntries = performance.getEntriesByType('paint');
        
        const metrics = {
          loadTime: navigation.loadEventEnd - navigation.loadEventStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          firstPaint: paintEntries.find(entry => entry.name === 'first-paint')?.startTime,
          firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime
        };
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Performance Metrics:', metrics);
        }
        
        // Send metrics to analytics in production
        if (process.env.NODE_ENV === 'production') {
          sendPerformanceMetrics(metrics);
        }
      }, 0);
    });
  }
}

function sendPerformanceMetrics(metrics) {
  // This could be sent to analytics service like Google Analytics
  // or a custom monitoring solution
  if (navigator.sendBeacon) {
    const data = JSON.stringify(metrics);
    navigator.sendBeacon('/api/performance', data);
  }
}

// Enable monitoring by default
enablePerformanceMonitoring();
