import { Page, expect } from '@playwright/test';

/**
 * Utility functions for E2E tests
 * Provides common functionality and helpers for category E2E tests
 */

export class CategoryTestUtils {
  constructor(private page: Page) {}

  /**
   * Login with default test credentials
   */
  async login(email = 'proprietario@test.com', password = 'password123') {
    await this.page.goto('/auth/login');
    await this.page.fill('[data-cy=email-input]', email);
    await this.page.fill('[data-cy=password-input]', password);
    await this.page.click('[data-cy=login-btn]');
    await this.page.waitForURL('/dashboard');
  }

  /**
   * Select establishment by index or name
   */
  async selectEstablishment(indexOrName: number | string = 0) {
    await this.page.click('[data-cy=establishment-selector]');
    
    if (typeof indexOrName === 'number') {
      await this.page.click(`[data-cy=establishment-option]:nth-child(${indexOrName + 1})`);
    } else {
      await this.page.click(`[data-cy=establishment-option]:has-text("${indexOrName}")`);
    }
    
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to categories page
   */
  async navigateToCategories() {
    await this.page.goto('/categories');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Complete login and navigation setup
   */
  async setupTest(email?: string, password?: string, establishmentIndex?: number) {
    await this.login(email, password);
    await this.selectEstablishment(establishmentIndex);
    await this.navigateToCategories();
  }

  /**
   * Create a category with given data
   */
  async createCategory(name: string, description: string) {
    await this.page.click('[data-cy=create-category-btn]');
    await this.page.waitForSelector('[data-cy=category-form]');
    
    await this.page.fill('[data-cy=category-name-input]', name);
    await this.page.fill('[data-cy=category-description-input]', description);
    await this.page.click('[data-cy=submit-btn]');
    
    await this.page.waitForURL('/categories');
    await expect(this.page.locator('[data-cy=success-message]')).toBeVisible();
    
    return { name, description };
  }

  /**
   * Edit a category by name
   */
  async editCategory(currentName: string, newName: string, newDescription: string) {
    const categoryCard = this.page.locator(`[data-cy=category-card]:has-text("${currentName}")`);
    await categoryCard.locator('[data-cy=edit-category-btn]').click();
    
    await this.page.fill('[data-cy=category-name-input]', newName);
    await this.page.fill('[data-cy=category-description-input]', newDescription);
    await this.page.click('[data-cy=submit-btn]');
    
    await this.page.waitForURL('/categories');
    await expect(this.page.locator('[data-cy=success-message]')).toBeVisible();
    
    return { name: newName, description: newDescription };
  }

  /**
   * Delete a category by name
   */
  async deleteCategory(name: string, confirm = true) {
    const categoryCard = this.page.locator(`[data-cy=category-card]:has-text("${name}")`);
    await categoryCard.locator('[data-cy=delete-category-btn]').click();
    
    await expect(this.page.locator('[data-cy=delete-confirmation-modal]')).toBeVisible();
    
    if (confirm) {
      await this.page.click('[data-cy=confirm-delete-btn]');
      await expect(this.page.locator('[data-cy=success-message]')).toBeVisible();
    } else {
      await this.page.click('[data-cy=cancel-delete-btn]');
    }
  }

  /**
   * Search for categories
   */
  async searchCategories(query: string) {
    const searchInput = this.page.locator('[data-cy=search-input]');
    await searchInput.fill(query);
    await this.page.waitForTimeout(1000); // Wait for debounce
  }

  /**
   * Clear search
   */
  async clearSearch() {
    const searchInput = this.page.locator('[data-cy=search-input]');
    await searchInput.fill('');
    await this.page.waitForTimeout(1000);
  }

  /**
   * Get category count
   */
  async getCategoryCount(): Promise<number> {
    const categoryCards = this.page.locator('[data-cy=category-card]');
    return await categoryCards.count();
  }

  /**
   * Verify category exists in list
   */
  async verifyCategoryExists(name: string, shouldExist = true) {
    const categoryCard = this.page.locator(`[data-cy=category-card]:has-text("${name}")`);
    
    if (shouldExist) {
      await expect(categoryCard).toBeVisible();
    } else {
      await expect(categoryCard).not.toBeVisible();
    }
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoading() {
    const loadingSpinner = this.page.locator('[data-cy=loading-spinner]');
    
    // Wait for spinner to appear (if it does)
    try {
      await loadingSpinner.waitFor({ state: 'visible', timeout: 1000 });
    } catch {
      // Spinner might not appear for fast operations
    }
    
    // Wait for spinner to disappear
    await loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Take screenshot with timestamp
   */
  async takeScreenshot(name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${timestamp}.png`,
      fullPage: true 
    });
  }

  /**
   * Mock API response
   */
  async mockApiResponse(endpoint: string, response: any, status = 200) {
    await this.page.route(`**${endpoint}`, route => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  /**
   * Mock API error
   */
  async mockApiError(endpoint: string, status = 500, message = 'Internal Server Error') {
    await this.page.route(`**${endpoint}`, route => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ error: message, message })
      });
    });
  }

  /**
   * Simulate network conditions
   */
  async simulateSlowNetwork(delay = 2000) {
    await this.page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, delay));
      route.continue();
    });
  }

  /**
   * Simulate offline condition
   */
  async simulateOffline() {
    await this.page.context().setOffline(true);
  }

  /**
   * Restore online condition
   */
  async restoreOnline() {
    await this.page.context().setOffline(false);
  }

  /**
   * Check for console errors
   */
  async checkConsoleErrors(): Promise<string[]> {
    const consoleErrors: string[] = [];
    
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    return consoleErrors;
  }

  /**
   * Verify accessibility attributes
   */
  async verifyAccessibility(selector: string) {
    const element = this.page.locator(selector);
    
    // Check for ARIA attributes
    const ariaLabel = await element.getAttribute('aria-label');
    const ariaDescribedBy = await element.getAttribute('aria-describedby');
    const role = await element.getAttribute('role');
    
    return {
      hasAriaLabel: !!ariaLabel,
      hasAriaDescribedBy: !!ariaDescribedBy,
      hasRole: !!role,
      ariaLabel,
      ariaDescribedBy,
      role
    };
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation(startSelector: string, expectedSelectors: string[]) {
    const startElement = this.page.locator(startSelector);
    await startElement.focus();
    await expect(startElement).toBeFocused();
    
    for (const selector of expectedSelectors) {
      await this.page.keyboard.press('Tab');
      const element = this.page.locator(selector);
      await expect(element).toBeFocused();
    }
  }

  /**
   * Generate test data
   */
  generateTestData(prefix = 'Test', count = 1) {
    const timestamp = Date.now();
    const data = [];
    
    for (let i = 0; i < count; i++) {
      data.push({
        name: `${prefix} Category ${timestamp}-${i}`,
        description: `${prefix} category description ${timestamp}-${i}`
      });
    }
    
    return data;
  }

  /**
   * Clean up test data
   */
  async cleanupTestData(namePattern: string) {
    const categoryCards = this.page.locator(`[data-cy=category-card]:has-text("${namePattern}")`);
    const count = await categoryCards.count();
    
    for (let i = 0; i < count; i++) {
      const card = categoryCards.nth(i);
      const name = await card.locator('[data-cy=category-name]').textContent();
      
      if (name && name.includes(namePattern)) {
        await this.deleteCategory(name);
      }
    }
  }
}

/**
 * Performance measurement utilities
 */
export class PerformanceUtils {
  constructor(private page: Page) {}

  /**
   * Measure page load time
   */
  async measurePageLoad(url: string): Promise<number> {
    const startTime = Date.now();
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
    return Date.now() - startTime;
  }

  /**
   * Measure interaction time
   */
  async measureInteraction(action: () => Promise<void>): Promise<number> {
    const startTime = Date.now();
    await action();
    return Date.now() - startTime;
  }

  /**
   * Get memory usage
   */
  async getMemoryUsage() {
    return await this.page.evaluate(() => {
      const memory = (performance as any).memory;
      return memory ? {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      } : null;
    });
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics() {
    return await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    });
  }
}

/**
 * Visual testing utilities
 */
export class VisualTestUtils {
  constructor(private page: Page) {}

  /**
   * Compare screenshot with baseline
   */
  async compareScreenshot(name: string, options?: { threshold?: number; fullPage?: boolean }) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-actual.png`,
      fullPage: options?.fullPage ?? true
    });
    
    // In a real implementation, you would compare with baseline images
    // and return comparison results
  }

  /**
   * Test responsive design
   */
  async testResponsiveDesign(selector: string, viewports: Array<{ width: number; height: number }>) {
    const results = [];
    
    for (const viewport of viewports) {
      await this.page.setViewportSize(viewport);
      await this.page.waitForTimeout(500); // Allow layout to settle
      
      const element = this.page.locator(selector);
      const boundingBox = await element.boundingBox();
      
      results.push({
        viewport,
        boundingBox,
        isVisible: await element.isVisible()
      });
    }
    
    return results;
  }
}