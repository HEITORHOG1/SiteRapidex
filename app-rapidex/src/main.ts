import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Initialize performance monitoring
if (typeof window !== 'undefined') {
  // Record initial page load performance
  window.addEventListener('load', () => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      console.log('Page Load Performance:', {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        totalTime: navigation.loadEventEnd - navigation.navigationStart
      });
    }
  });

  // Monitor memory usage
  if ('memory' in performance) {
    setInterval(() => {
      const memInfo = (performance as any).memory;
      if (memInfo.usedJSHeapSize > 100 * 1024 * 1024) { // 100MB threshold
        console.warn('High memory usage detected:', {
          used: Math.round(memInfo.usedJSHeapSize / 1024 / 1024) + 'MB',
          total: Math.round(memInfo.totalJSHeapSize / 1024 / 1024) + 'MB'
        });
      }
    }, 30000); // Check every 30 seconds
  }
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
