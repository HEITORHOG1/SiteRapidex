// Models and DTOs
export * from './models';

// Routes
export * from './categories.routes';

// Validation System
export * from './validation';

// Services
export * from './services/category-http.service';
export * from './services/category-state.service';
export * from './services/category-cache.service';
export * from './services/category-search.service';
export * from './services/category-validation.service';
export * from './services/category-deletion.service';
export * from './services/category-analytics.service';
export * from './services/category-chart.service';
export * from './services/category-import.service';
export * from './services/category-export.service';
export * from './services/category-offline.service';
export * from './services/category-offline-sync.service';
export * from './services/category-offline-storage.service';
export * from './services/category-conflict-resolution.service';
export * from './services/category-sw-registration.service';
export * from './services/category-accessibility.service';
export * from './services/category-accessibility-testing.service';
export * from './services/category-performance-metrics.service';
export * from './services/category-bundle-optimizer.service';
export * from './services/category-lazy-loader.service';
export * from './services/category-performance-budget.service';
export * from './services/category-code-splitting.service';

// Components
export * from './components/category-virtual-scroll';

// Re-export for convenience
export { CATEGORY_ROUTES, CATEGORY_ENDPOINTS } from './categories.routes';