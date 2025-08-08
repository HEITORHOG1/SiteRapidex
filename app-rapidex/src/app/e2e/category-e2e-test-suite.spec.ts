import { test, expect, Page } from '@playwright/test';

/**
 * Comprehensive E2E Test Suite for Category Management
 * This is the main test suite that orchestrates all category E2E tests
 * Requirements: All requirements - Complete E2E testing coverage
 */

test.describe('Category Management E2E Test Suite', () => {
  let page: Page;
  
  test.beforeAll(async () => {
    console.log('🚀 Starting Category Management E2E Test Suite');
  });
  
  test.afterAll(async () => {
    console.log('✅ Category Management E2E Test Suite completed');
  });
  
  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Common setup for all tests
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

  test.describe('Smoke Tests', () => {
    test('should load category management page successfully', async () => {
      // Verify page loads
      await expect(page).toHaveURL(/\/categories$/);
      await expect(page.locator('h1')).toContainText('Categorias');
      
      // Verify main elements are present
      await expect(page.locator('[data-cy=category-list]')).toBeVisible();
      await expect(page.locator('[data-cy=create-category-btn]')).toBeVisible();
      
      // Verify no console errors
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Should have no critical console errors
      const criticalErrors = consoleErrors.filter(error => 
        !error.includes('favicon') && 
        !error.includes('404') &&
        !error.includes('warning')
      );
      
      expect(criticalErrors).toHaveLength(0);
    });

    test('should handle authentication properly', async () => {
      // Verify user is authenticated
      const userInfo = page.locator('[data-cy=user-info]');
      if (await userInfo.count() > 0) {
        await expect(userInfo).toBeVisible();
      }
      
      // Verify establishment is selected
      const establishmentSelector = page.locator('[data-cy=establishment-selector]');
      await expect(establishmentSelector).toBeVisible();
      
      // Test logout functionality
      const logoutBtn = page.locator('[data-cy=logout-btn]');
      if (await logoutBtn.count() > 0) {
        await logoutBtn.click();
        await page.waitForURL('/auth/login');
        await expect(page).toHaveURL('/auth/login');
      }
    });
  });

  test.describe('Critical Path Tests', () => {
    test('should complete end-to-end category lifecycle', async () => {
      const categoryName = `E2E Test Category ${Date.now()}`;
      const categoryDescription = 'End-to-end test category description';
      
      // Step 1: Create category
      await test.step('Create new category', async () => {
        await page.click('[data-cy=create-category-btn]');
        await page.waitForSelector('[data-cy=category-form]');
        
        await page.fill('[data-cy=category-name-input]', categoryName);
        await page.fill('[data-cy=category-description-input]', categoryDescription);
        await page.click('[data-cy=submit-btn]');
        
        await page.waitForURL('/categories');
        await expect(page.locator('[data-cy=success-message]')).toBeVisible();
        await expect(page.locator(`[data-cy=category-card]:has-text("${categoryName}")`)).toBeVisible();
      });
      
      // Step 2: View category details
      await test.step('View category details', async () => {
        const categoryCard = page.locator(`[data-cy=category-card]:has-text("${categoryName}")`);
        await categoryCard.click();
        
        await page.waitForURL(/\/categories\/\d+$/);
        await expect(page.locator('[data-cy=category-detail-name]')).toContainText(categoryName);
        await expect(page.locator('[data-cy=category-detail-description]')).toContainText(categoryDescription);
        
        await page.click('[data-cy=back-to-list-btn]');
        await page.waitForURL('/categories');
      });
      
      // Step 3: Edit category
      await test.step('Edit category', async () => {
        const categoryCard = page.locator(`[data-cy=category-card]:has-text("${categoryName}")`);
        await categoryCard.locator('[data-cy=edit-category-btn]').click();
        
        const updatedName = `${categoryName} Updated`;
        const updatedDescription = `${categoryDescription} - Updated`;
        
        await page.fill('[data-cy=category-name-input]', updatedName);
        await page.fill('[data-cy=category-description-input]', updatedDescription);
        await page.click('[data-cy=submit-btn]');
        
        await page.waitForURL('/categories');
        await expect(page.locator('[data-cy=success-message]')).toBeVisible();
        await expect(page.locator(`[data-cy=category-card]:has-text("${updatedName}")`)).toBeVisible();
      });
      
      // Step 4: Search for category
      await test.step('Search for category', async () => {
        const searchInput = page.locator('[data-cy=search-input]');
        await searchInput.fill('Updated');
        
        await page.waitForTimeout(1000); // Wait for debounce
        
        const searchResults = page.locator('[data-cy=category-card]');
        const resultCount = await searchResults.count();
        
        expect(resultCount).toBeGreaterThan(0);
        await expect(searchResults.first()).toContainText('Updated');
        
        // Clear search
        await searchInput.fill('');
        await page.waitForTimeout(1000);
      });
      
      // Step 5: Delete category
      await test.step('Delete category', async () => {
        const updatedName = `${categoryName} Updated`;
        const categoryCard = page.locator(`[data-cy=category-card]:has-text("${updatedName}")`);
        await categoryCard.locator('[data-cy=delete-category-btn]').click();
        
        await expect(page.locator('[data-cy=delete-confirmation-modal]')).toBeVisible();
        await page.click('[data-cy=confirm-delete-btn]');
        
        await expect(page.locator('[data-cy=success-message]')).toBeVisible();
        await expect(page.locator(`[data-cy=category-card]:has-text("${updatedName}")`)).not.toBeVisible();
      });
    });

    test('should handle bulk operations', async () => {
      // Create multiple categories for bulk operations
      const categories = [
        { name: 'Bulk Test 1', description: 'First bulk test category' },
        { name: 'Bulk Test 2', description: 'Second bulk test category' },
        { name: 'Bulk Test 3', description: 'Third bulk test category' }
      ];
      
      // Create categories
      for (const category of categories) {
        await page.click('[data-cy=create-category-btn]');
        await page.fill('[data-cy=category-name-input]', category.name);
        await page.fill('[data-cy=category-description-input]', category.description);
        await page.click('[data-cy=submit-btn]');
        await page.waitForURL('/categories');
      }
      
      // Test bulk selection
      const bulkSelectBtn = page.locator('[data-cy=bulk-select-btn]');
      if (await bulkSelectBtn.count() > 0) {
        await bulkSelectBtn.click();
        
        // Select multiple categories
        for (const category of categories) {
          const categoryCard = page.locator(`[data-cy=category-card]:has-text("${category.name}")`);
          await categoryCard.locator('[data-cy=select-checkbox]').check();
        }
        
        // Bulk delete
        await page.click('[data-cy=bulk-delete-btn]');
        await expect(page.locator('[data-cy=bulk-delete-modal]')).toBeVisible();
        await page.click('[data-cy=confirm-bulk-delete-btn]');
        
        await expect(page.locator('[data-cy=success-message]')).toBeVisible();
        
        // Verify categories are deleted
        for (const category of categories) {
          await expect(page.locator(`[data-cy=category-card]:has-text("${category.name}")`)).not.toBeVisible();
        }
      }
    });
  });

  test.describe('Integration Tests', () => {
    test('should integrate with establishment switching', async () => {
      const category1Name = `Integration Test 1 ${Date.now()}`;
      const category2Name = `Integration Test 2 ${Date.now()}`;
      
      // Create category in first establishment
      await page.click('[data-cy=create-category-btn]');
      await page.fill('[data-cy=category-name-input]', category1Name);
      await page.fill('[data-cy=category-description-input]', 'Category in first establishment');
      await page.click('[data-cy=submit-btn]');
      await page.waitForURL('/categories');
      
      // Switch to second establishment (if available)
      await page.click('[data-cy=establishment-selector]');
      const establishmentOptions = page.locator('[data-cy=establishment-option]');
      const optionCount = await establishmentOptions.count();
      
      if (optionCount > 1) {
        await establishmentOptions.nth(1).click();
        await page.waitForLoadState('networkidle');
        
        // Should not see first establishment's category
        await expect(page.locator(`[data-cy=category-card]:has-text("${category1Name}")`)).not.toBeVisible();
        
        // Create category in second establishment
        await page.click('[data-cy=create-category-btn]');
        await page.fill('[data-cy=category-name-input]', category2Name);
        await page.fill('[data-cy=category-description-input]', 'Category in second establishment');
        await page.click('[data-cy=submit-btn]');
        await page.waitForURL('/categories');
        
        // Should see second establishment's category
        await expect(page.locator(`[data-cy=category-card]:has-text("${category2Name}")`)).toBeVisible();
        
        // Switch back to first establishment
        await page.click('[data-cy=establishment-selector]');
        await establishmentOptions.first().click();
        await page.waitForLoadState('networkidle');
        
        // Should see first establishment's category again
        await expect(page.locator(`[data-cy=category-card]:has-text("${category1Name}")`)).toBeVisible();
        await expect(page.locator(`[data-cy=category-card]:has-text("${category2Name}")`)).not.toBeVisible();
      }
    });

    test('should integrate with notification system', async () => {
      const categoryName = `Notification Test ${Date.now()}`;
      
      // Create category and verify notification
      await page.click('[data-cy=create-category-btn]');
      await page.fill('[data-cy=category-name-input]', categoryName);
      await page.fill('[data-cy=category-description-input]', 'Testing notification integration');
      await page.click('[data-cy=submit-btn]');
      
      await page.waitForURL('/categories');
      
      // Should show success notification
      const notification = page.locator('[data-cy=notification], [data-cy=success-message], [data-cy=toast]');
      await expect(notification).toBeVisible();
      
      // Notification should contain success message
      await expect(notification).toContainText(/criada|sucesso|success/i);
      
      // Notification should auto-dismiss or be dismissible
      await page.waitForTimeout(5000);
      const isStillVisible = await notification.isVisible();
      
      if (isStillVisible) {
        const dismissBtn = notification.locator('[data-cy=dismiss-btn], [aria-label*="close"], [aria-label*="dismiss"]');
        if (await dismissBtn.count() > 0) {
          await dismissBtn.click();
          await expect(notification).not.toBeVisible();
        }
      }
    });
  });

  test.describe('Data Validation Tests', () => {
    test('should validate data integrity across operations', async () => {
      const categoryName = `Data Integrity Test ${Date.now()}`;
      const categoryDescription = 'Testing data integrity across operations';
      
      // Create category
      await page.click('[data-cy=create-category-btn]');
      await page.fill('[data-cy=category-name-input]', categoryName);
      await page.fill('[data-cy=category-description-input]', categoryDescription);
      await page.click('[data-cy=submit-btn]');
      await page.waitForURL('/categories');
      
      // Verify data in list view
      const categoryCard = page.locator(`[data-cy=category-card]:has-text("${categoryName}")`);
      await expect(categoryCard.locator('[data-cy=category-name]')).toContainText(categoryName);
      await expect(categoryCard.locator('[data-cy=category-description]')).toContainText(categoryDescription);
      
      // Verify data in detail view
      await categoryCard.click();
      await page.waitForURL(/\/categories\/\d+$/);
      
      await expect(page.locator('[data-cy=category-detail-name]')).toContainText(categoryName);
      await expect(page.locator('[data-cy=category-detail-description]')).toContainText(categoryDescription);
      
      // Verify data in edit form
      await page.click('[data-cy=edit-category-btn]');
      await expect(page.locator('[data-cy=category-name-input]')).toHaveValue(categoryName);
      await expect(page.locator('[data-cy=category-description-input]')).toHaveValue(categoryDescription);
      
      // Cancel edit and verify data unchanged
      await page.click('[data-cy=cancel-btn]');
      await page.waitForURL(/\/categories\/\d+$/);
      
      await expect(page.locator('[data-cy=category-detail-name]')).toContainText(categoryName);
      await expect(page.locator('[data-cy=category-detail-description]')).toContainText(categoryDescription);
    });

    test('should maintain data consistency during concurrent operations', async () => {
      const baseName = `Concurrent Test ${Date.now()}`;
      
      // Simulate concurrent operations by opening multiple tabs
      const context = page.context();
      const page2 = await context.newPage();
      
      // Setup second page
      await page2.goto('/auth/login');
      await page2.fill('[data-cy=email-input]', 'proprietario@test.com');
      await page2.fill('[data-cy=password-input]', 'password123');
      await page2.click('[data-cy=login-btn]');
      await page2.waitForURL('/dashboard');
      await page2.click('[data-cy=establishment-selector]');
      await page2.click('[data-cy=establishment-option]:first-child');
      await page2.goto('/categories');
      await page2.waitForLoadState('networkidle');
      
      // Create category on first page
      await page.click('[data-cy=create-category-btn]');
      await page.fill('[data-cy=category-name-input]', `${baseName} Page 1`);
      await page.fill('[data-cy=category-description-input]', 'Created from page 1');
      await page.click('[data-cy=submit-btn]');
      await page.waitForURL('/categories');
      
      // Refresh second page and verify category appears
      await page2.reload();
      await page2.waitForLoadState('networkidle');
      await expect(page2.locator(`[data-cy=category-card]:has-text("${baseName} Page 1")`)).toBeVisible();
      
      // Create category on second page
      await page2.click('[data-cy=create-category-btn]');
      await page2.fill('[data-cy=category-name-input]', `${baseName} Page 2`);
      await page2.fill('[data-cy=category-description-input]', 'Created from page 2');
      await page2.click('[data-cy=submit-btn]');
      await page2.waitForURL('/categories');
      
      // Refresh first page and verify both categories appear
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(page.locator(`[data-cy=category-card]:has-text("${baseName} Page 1")`)).toBeVisible();
      await expect(page.locator(`[data-cy=category-card]:has-text("${baseName} Page 2")`)).toBeVisible();
      
      await page2.close();
    });
  });

  test.describe('User Experience Tests', () => {
    test('should provide smooth user experience', async () => {
      // Test loading states
      await page.click('[data-cy=create-category-btn]');
      
      // Form should appear quickly
      await expect(page.locator('[data-cy=category-form]')).toBeVisible({ timeout: 1000 });
      
      // Test form interactions
      const nameInput = page.locator('[data-cy=category-name-input]');
      const descriptionInput = page.locator('[data-cy=category-description-input]');
      
      await nameInput.fill('UX Test Category');
      await descriptionInput.fill('Testing user experience');
      
      // Should show validation feedback
      await nameInput.fill('');
      await nameInput.blur();
      await expect(page.locator('[data-cy=name-error]')).toBeVisible();
      
      await nameInput.fill('UX Test Category');
      await expect(page.locator('[data-cy=name-error]')).not.toBeVisible();
      
      // Submit should work smoothly
      await page.click('[data-cy=submit-btn]');
      await page.waitForURL('/categories');
      
      // Should show success feedback
      await expect(page.locator('[data-cy=success-message]')).toBeVisible();
    });

    test('should handle empty states gracefully', async () => {
      // If there are no categories, should show empty state
      const categoryCards = page.locator('[data-cy=category-card]');
      const cardCount = await categoryCards.count();
      
      if (cardCount === 0) {
        const emptyState = page.locator('[data-cy=empty-state]');
        await expect(emptyState).toBeVisible();
        await expect(emptyState).toContainText(/nenhuma categoria|sem categorias|no categories/i);
        
        // Should have call-to-action
        const createBtn = emptyState.locator('[data-cy=create-category-btn], [data-cy=create-first-category-btn]');
        await expect(createBtn).toBeVisible();
      }
    });
  });
});