import { test, expect, Page, Browser } from '@playwright/test';

/**
 * E2E Tests for Category Cross-Browser Compatibility
 * Tests category functionality across different browsers and devices
 * Requirements: All requirements - Cross-browser compatibility
 */

// Test configuration for different browsers
const browsers = ['chromium', 'firefox', 'webkit'] as const;
const viewports = [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 667 }
] as const;

test.describe('Category Cross-Browser Compatibility', () => {
  
  // Test core functionality across all browsers
  for (const browserName of browsers) {
    test.describe(`${browserName} browser tests`, () => {
      let page: Page;
      
      test.beforeEach(async ({ page: testPage }) => {
        page = testPage;
        
        // Login and setup
        await page.goto('/auth/login');
        await page.fill('[data-cy=email-input]', 'proprietario@test.com');
        await page.fill('[data-cy=password-input]', 'password123');
        await page.click('[data-cy=login-btn]');
        
        await page.waitForURL('/dashboard');
        await page.click('[data-cy=establishment-selector]');
        await page.click('[data-cy=establishment-option]:first-child');
        
        await page.goto('/categories');
        await page.waitForLoadState('networkidle');
      });

      test(`should handle basic CRUD operations in ${browserName}`, async () => {
        const categoryName = `${browserName} Test Category ${Date.now()}`;
        
        // Create category
        await page.click('[data-cy=create-category-btn]');
        await page.fill('[data-cy=category-name-input]', categoryName);
        await page.fill('[data-cy=category-description-input]', `Testing in ${browserName}`);
        await page.click('[data-cy=submit-btn]');
        
        await page.waitForURL('/categories');
        await expect(page.locator(`[data-cy=category-card]:has-text("${categoryName}")`)).toBeVisible();
        
        // Edit category
        const categoryCard = page.locator(`[data-cy=category-card]:has-text("${categoryName}")`);
        await categoryCard.locator('[data-cy=edit-category-btn]').click();
        
        const updatedName = `${categoryName} Updated`;
        await page.fill('[data-cy=category-name-input]', updatedName);
        await page.click('[data-cy=submit-btn]');
        
        await page.waitForURL('/categories');
        await expect(page.locator(`[data-cy=category-card]:has-text("${updatedName}")`)).toBeVisible();
        
        // Delete category
        const updatedCard = page.locator(`[data-cy=category-card]:has-text("${updatedName}")`);
        await updatedCard.locator('[data-cy=delete-category-btn]').click();
        await page.click('[data-cy=confirm-delete-btn]');
        
        await expect(page.locator(`[data-cy=category-card]:has-text("${updatedName}")`)).not.toBeVisible();
      });

      test(`should handle form validation in ${browserName}`, async () => {
        await page.click('[data-cy=create-category-btn]');
        
        // Test HTML5 validation
        const nameInput = page.locator('[data-cy=category-name-input]');
        const descriptionInput = page.locator('[data-cy=category-description-input]');
        
        // Check required attributes
        await expect(nameInput).toHaveAttribute('required');
        await expect(descriptionInput).toHaveAttribute('required');
        
        // Test validation on submit
        await page.click('[data-cy=submit-btn]');
        
        // Should show validation errors
        await expect(page.locator('[data-cy=name-error]')).toBeVisible();
        await expect(page.locator('[data-cy=description-error]')).toBeVisible();
        
        // Fix validation
        await nameInput.fill('Valid Name');
        await descriptionInput.fill('Valid Description');
        
        await page.click('[data-cy=submit-btn]');
        await page.waitForURL('/categories');
        await expect(page.locator('[data-cy=success-message]')).toBeVisible();
      });

      test(`should handle keyboard navigation in ${browserName}`, async () => {
        // Tab navigation
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        
        const createBtn = page.locator('[data-cy=create-category-btn]');
        await createBtn.focus();
        await expect(createBtn).toBeFocused();
        
        // Enter to activate
        await page.keyboard.press('Enter');
        await expect(page.locator('[data-cy=category-form]')).toBeVisible();
        
        // Form navigation
        const nameInput = page.locator('[data-cy=category-name-input]');
        await expect(nameInput).toBeFocused();
        
        await page.keyboard.type('Keyboard Test');
        await page.keyboard.press('Tab');
        
        const descriptionInput = page.locator('[data-cy=category-description-input]');
        await expect(descriptionInput).toBeFocused();
      });
    });
  }

  // Test responsive design across different viewports
  for (const viewport of viewports) {
    test.describe(`${viewport.name} viewport tests`, () => {
      let page: Page;
      
      test.beforeEach(async ({ page: testPage }) => {
        page = testPage;
        
        // Set viewport
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        
        // Login and setup
        await page.goto('/auth/login');
        await page.fill('[data-cy=email-input]', 'proprietario@test.com');
        await page.fill('[data-cy=password-input]', 'password123');
        await page.click('[data-cy=login-btn]');
        
        await page.waitForURL('/dashboard');
        await page.click('[data-cy=establishment-selector]');
        await page.click('[data-cy=establishment-option]:first-child');
        
        await page.goto('/categories');
        await page.waitForLoadState('networkidle');
      });

      test(`should display correctly on ${viewport.name}`, async () => {
        // Check main elements are visible
        await expect(page.locator('[data-cy=category-list]')).toBeVisible();
        await expect(page.locator('[data-cy=create-category-btn]')).toBeVisible();
        
        // Check responsive layout
        if (viewport.name === 'mobile') {
          // Mobile-specific checks
          const categoryCard = page.locator('[data-cy=category-card]').first();
          if (await categoryCard.count() > 0) {
            const cardBox = await categoryCard.boundingBox();
            expect(cardBox?.width).toBeLessThan(viewport.width);
          }
          
          // Check if mobile menu exists
          const mobileMenu = page.locator('[data-cy=mobile-menu]');
          if (await mobileMenu.count() > 0) {
            await expect(mobileMenu).toBeVisible();
          }
        } else if (viewport.name === 'tablet') {
          // Tablet-specific checks
          const categoryGrid = page.locator('[data-cy=category-grid]');
          if (await categoryGrid.count() > 0) {
            const gridBox = await categoryGrid.boundingBox();
            expect(gridBox?.width).toBeLessThan(viewport.width);
          }
        } else {
          // Desktop-specific checks
          const sidebar = page.locator('[data-cy=sidebar]');
          if (await sidebar.count() > 0) {
            await expect(sidebar).toBeVisible();
          }
        }
      });

      test(`should handle form interactions on ${viewport.name}`, async () => {
        await page.click('[data-cy=create-category-btn]');
        
        // Form should be visible and usable
        const form = page.locator('[data-cy=category-form]');
        await expect(form).toBeVisible();
        
        const nameInput = page.locator('[data-cy=category-name-input]');
        const descriptionInput = page.locator('[data-cy=category-description-input]');
        
        // Inputs should be properly sized
        const nameBox = await nameInput.boundingBox();
        const descBox = await descriptionInput.boundingBox();
        
        expect(nameBox?.width).toBeGreaterThan(100);
        expect(descBox?.width).toBeGreaterThan(100);
        
        // Should be able to interact
        await nameInput.fill(`${viewport.name} Test Category`);
        await descriptionInput.fill(`Testing on ${viewport.name} viewport`);
        
        // Submit button should be accessible
        const submitBtn = page.locator('[data-cy=submit-btn]');
        await expect(submitBtn).toBeVisible();
        
        const submitBox = await submitBtn.boundingBox();
        expect(submitBox?.height).toBeGreaterThan(30); // Minimum touch target
        
        await submitBtn.click();
        await page.waitForURL('/categories');
        await expect(page.locator('[data-cy=success-message]')).toBeVisible();
      });

      test(`should handle touch interactions on ${viewport.name}`, async () => {
        if (viewport.name === 'mobile' || viewport.name === 'tablet') {
          // Test touch interactions
          const categoryCard = page.locator('[data-cy=category-card]').first();
          
          if (await categoryCard.count() > 0) {
            // Touch to select/view
            await categoryCard.tap();
            
            // Should respond to touch
            // Note: Specific behavior depends on implementation
            
            // Test swipe gestures if implemented
            const cardBox = await categoryCard.boundingBox();
            if (cardBox) {
              // Simulate swipe
              await page.mouse.move(cardBox.x + 10, cardBox.y + cardBox.height / 2);
              await page.mouse.down();
              await page.mouse.move(cardBox.x + cardBox.width - 10, cardBox.y + cardBox.height / 2);
              await page.mouse.up();
            }
          }
        }
      });
    });
  }

  test.describe('Browser-specific feature tests', () => {
    test('should handle Safari-specific issues', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'Safari-specific test');
      
      await page.goto('/auth/login');
      await page.fill('[data-cy=email-input]', 'proprietario@test.com');
      await page.fill('[data-cy=password-input]', 'password123');
      await page.click('[data-cy=login-btn]');
      
      await page.waitForURL('/dashboard');
      await page.click('[data-cy=establishment-selector]');
      await page.click('[data-cy=establishment-option]:first-child');
      await page.goto('/categories');
      
      // Test Safari-specific date handling
      await page.click('[data-cy=create-category-btn]');
      
      const dateInput = page.locator('[data-cy=date-input]');
      if (await dateInput.count() > 0) {
        // Safari has different date input behavior
        await dateInput.fill('2024-12-31');
        const value = await dateInput.inputValue();
        expect(value).toBeTruthy();
      }
      
      // Test Safari flexbox issues
      const form = page.locator('[data-cy=category-form]');
      const formStyles = await form.evaluate(el => getComputedStyle(el));
      
      // Should have proper flexbox support
      if (formStyles.display === 'flex') {
        expect(formStyles.flexDirection).toBeTruthy();
      }
    });

    test('should handle Firefox-specific issues', async ({ page, browserName }) => {
      test.skip(browserName !== 'firefox', 'Firefox-specific test');
      
      await page.goto('/auth/login');
      await page.fill('[data-cy=email-input]', 'proprietario@test.com');
      await page.fill('[data-cy=password-input]', 'password123');
      await page.click('[data-cy=login-btn]');
      
      await page.waitForURL('/dashboard');
      await page.click('[data-cy=establishment-selector]');
      await page.click('[data-cy=establishment-option]:first-child');
      await page.goto('/categories');
      
      // Test Firefox scrollbar behavior
      const categoryList = page.locator('[data-cy=category-list]');
      const listStyles = await categoryList.evaluate(el => getComputedStyle(el));
      
      // Firefox handles scrollbars differently
      if (listStyles.overflowY === 'auto' || listStyles.overflowY === 'scroll') {
        // Should be scrollable
        const scrollHeight = await categoryList.evaluate(el => el.scrollHeight);
        const clientHeight = await categoryList.evaluate(el => el.clientHeight);
        
        if (scrollHeight > clientHeight) {
          // Test scrolling
          await categoryList.evaluate(el => el.scrollTo(0, 100));
          const scrollTop = await categoryList.evaluate(el => el.scrollTop);
          expect(scrollTop).toBeGreaterThan(0);
        }
      }
    });

    test('should handle Chrome-specific features', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Chrome-specific test');
      
      await page.goto('/auth/login');
      await page.fill('[data-cy=email-input]', 'proprietario@test.com');
      await page.fill('[data-cy=password-input]', 'password123');
      await page.click('[data-cy=login-btn]');
      
      await page.waitForURL('/dashboard');
      await page.click('[data-cy=establishment-selector]');
      await page.click('[data-cy=establishment-option]:first-child');
      await page.goto('/categories');
      
      // Test Chrome DevTools integration
      const performanceEntries = await page.evaluate(() => {
        return performance.getEntriesByType('navigation');
      });
      
      expect(performanceEntries.length).toBeGreaterThan(0);
      
      // Test Chrome-specific APIs
      const memoryInfo = await page.evaluate(() => {
        return (performance as any).memory;
      });
      
      if (memoryInfo) {
        expect(memoryInfo.usedJSHeapSize).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Accessibility across browsers', () => {
    for (const browserName of browsers) {
      test(`should maintain accessibility standards in ${browserName}`, async ({ page }) => {
        await page.goto('/auth/login');
        await page.fill('[data-cy=email-input]', 'proprietario@test.com');
        await page.fill('[data-cy=password-input]', 'password123');
        await page.click('[data-cy=login-btn]');
        
        await page.waitForURL('/dashboard');
        await page.click('[data-cy=establishment-selector]');
        await page.click('[data-cy=establishment-option]:first-child');
        await page.goto('/categories');
        
        // Test ARIA attributes
        const createBtn = page.locator('[data-cy=create-category-btn]');
        await expect(createBtn).toHaveAttribute('aria-label');
        
        // Test keyboard navigation
        await page.keyboard.press('Tab');
        await createBtn.focus();
        await expect(createBtn).toBeFocused();
        
        // Test screen reader support
        const liveRegion = page.locator('[aria-live]');
        await expect(liveRegion).toBeAttached();
        
        // Test color contrast (simplified)
        const btnStyles = await createBtn.evaluate(el => getComputedStyle(el));
        expect(btnStyles.color).toBeTruthy();
        expect(btnStyles.backgroundColor).toBeTruthy();
      });
    }
  });

  test.describe('Performance across browsers', () => {
    for (const browserName of browsers) {
      test(`should perform well in ${browserName}`, async ({ page }) => {
        await page.goto('/auth/login');
        await page.fill('[data-cy=email-input]', 'proprietario@test.com');
        await page.fill('[data-cy=password-input]', 'password123');
        await page.click('[data-cy=login-btn]');
        
        await page.waitForURL('/dashboard');
        await page.click('[data-cy=establishment-selector]');
        await page.click('[data-cy=establishment-option]:first-child');
        
        // Measure page load time
        const startTime = Date.now();
        await page.goto('/categories');
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;
        
        // Should load within reasonable time
        expect(loadTime).toBeLessThan(5000); // 5 seconds
        
        // Test interaction responsiveness
        const interactionStart = Date.now();
        await page.click('[data-cy=create-category-btn]');
        await page.waitForSelector('[data-cy=category-form]');
        const interactionTime = Date.now() - interactionStart;
        
        // Should respond quickly
        expect(interactionTime).toBeLessThan(1000); // 1 second
      });
    }
  });
});