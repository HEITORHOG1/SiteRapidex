import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Category Establishment Isolation
 * Tests that categories are properly isolated between establishments
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.6 - Establishment isolation and security
 */

test.describe('Category Establishment Isolation', () => {
  let page: Page;
  
  const establishment1 = {
    email: 'proprietario1@test.com',
    password: 'password123',
    establishmentName: 'Estabelecimento 1'
  };
  
  const establishment2 = {
    email: 'proprietario2@test.com',
    password: 'password123',
    establishmentName: 'Estabelecimento 2'
  };

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
  });

  test('should isolate categories between different establishments', async () => {
    const category1Name = `Category Est1 ${Date.now()}`;
    const category2Name = `Category Est2 ${Date.now()}`;

    // Create category in establishment 1
    await test.step('Create category in establishment 1', async () => {
      await loginAndSelectEstablishment(establishment1);
      await page.goto('/categories');
      
      await page.click('[data-cy=create-category-btn]');
      await page.fill('[data-cy=category-name-input]', category1Name);
      await page.fill('[data-cy=category-description-input]', 'Category for establishment 1');
      await page.click('[data-cy=submit-btn]');
      
      await page.waitForURL('/categories');
      await expect(page.locator(`[data-cy=category-card]:has-text("${category1Name}")`)).toBeVisible();
    });

    // Create category in establishment 2
    await test.step('Create category in establishment 2', async () => {
      await loginAndSelectEstablishment(establishment2);
      await page.goto('/categories');
      
      await page.click('[data-cy=create-category-btn]');
      await page.fill('[data-cy=category-name-input]', category2Name);
      await page.fill('[data-cy=category-description-input]', 'Category for establishment 2');
      await page.click('[data-cy=submit-btn]');
      
      await page.waitForURL('/categories');
      await expect(page.locator(`[data-cy=category-card]:has-text("${category2Name}")`)).toBeVisible();
    });

    // Verify establishment 1 cannot see establishment 2's categories
    await test.step('Verify establishment 1 isolation', async () => {
      await loginAndSelectEstablishment(establishment1);
      await page.goto('/categories');
      
      // Should see own category
      await expect(page.locator(`[data-cy=category-card]:has-text("${category1Name}")`)).toBeVisible();
      
      // Should NOT see other establishment's category
      await expect(page.locator(`[data-cy=category-card]:has-text("${category2Name}")`)).not.toBeVisible();
    });

    // Verify establishment 2 cannot see establishment 1's categories
    await test.step('Verify establishment 2 isolation', async () => {
      await loginAndSelectEstablishment(establishment2);
      await page.goto('/categories');
      
      // Should see own category
      await expect(page.locator(`[data-cy=category-card]:has-text("${category2Name}")`)).toBeVisible();
      
      // Should NOT see other establishment's category
      await expect(page.locator(`[data-cy=category-card]:has-text("${category1Name}")`)).not.toBeVisible();
    });
  });

  test('should prevent direct URL access to other establishment categories', async () => {
    let categoryId: string;

    // Create category in establishment 1 and get its ID
    await test.step('Create category and get ID', async () => {
      await loginAndSelectEstablishment(establishment1);
      await page.goto('/categories');
      
      await page.click('[data-cy=create-category-btn]');
      await page.fill('[data-cy=category-name-input]', `Protected Category ${Date.now()}`);
      await page.fill('[data-cy=category-description-input]', 'This should be protected');
      await page.click('[data-cy=submit-btn]');
      
      await page.waitForURL('/categories');
      
      // Click on category to get its ID from URL
      await page.click('[data-cy=category-card]:first-child');
      await page.waitForURL(/\/categories\/(\d+)$/);
      
      const url = page.url();
      categoryId = url.match(/\/categories\/(\d+)$/)?.[1] || '';
      expect(categoryId).toBeTruthy();
    });

    // Try to access the category from establishment 2
    await test.step('Attempt unauthorized access', async () => {
      await loginAndSelectEstablishment(establishment2);
      
      // Try to access the category directly via URL
      await page.goto(`/categories/${categoryId}`);
      
      // Should be redirected to access denied or categories list
      await page.waitForLoadState('networkidle');
      
      // Verify access is denied
      const currentUrl = page.url();
      expect(currentUrl).not.toContain(`/categories/${categoryId}`);
      
      // Should show error message or be redirected
      const isOnCategoriesList = currentUrl.includes('/categories') && !currentUrl.includes(`/${categoryId}`);
      const hasAccessDeniedMessage = await page.locator('[data-cy=access-denied-message]').isVisible();
      
      expect(isOnCategoriesList || hasAccessDeniedMessage).toBeTruthy();
    });
  });

  test('should handle establishment switching correctly', async () => {
    const category1Name = `Switch Test 1 ${Date.now()}`;
    const category2Name = `Switch Test 2 ${Date.now()}`;

    // Login as user with multiple establishments
    await page.goto('/auth/login');
    await page.fill('[data-cy=email-input]', 'multi.establishment@test.com');
    await page.fill('[data-cy=password-input]', 'password123');
    await page.click('[data-cy=login-btn]');
    await page.waitForURL('/dashboard');

    // Create category in first establishment
    await test.step('Create category in first establishment', async () => {
      await page.click('[data-cy=establishment-selector]');
      await page.click('[data-cy=establishment-option]:first-child');
      await page.goto('/categories');
      
      await page.click('[data-cy=create-category-btn]');
      await page.fill('[data-cy=category-name-input]', category1Name);
      await page.fill('[data-cy=category-description-input]', 'Category in first establishment');
      await page.click('[data-cy=submit-btn]');
      
      await page.waitForURL('/categories');
      await expect(page.locator(`[data-cy=category-card]:has-text("${category1Name}")`)).toBeVisible();
    });

    // Switch to second establishment and create category
    await test.step('Switch establishment and create category', async () => {
      await page.click('[data-cy=establishment-selector]');
      await page.click('[data-cy=establishment-option]:nth-child(2)');
      
      // Categories should be cleared/reloaded
      await page.waitForLoadState('networkidle');
      
      // Should not see first establishment's category
      await expect(page.locator(`[data-cy=category-card]:has-text("${category1Name}")`)).not.toBeVisible();
      
      // Create category in second establishment
      await page.click('[data-cy=create-category-btn]');
      await page.fill('[data-cy=category-name-input]', category2Name);
      await page.fill('[data-cy=category-description-input]', 'Category in second establishment');
      await page.click('[data-cy=submit-btn]');
      
      await page.waitForURL('/categories');
      await expect(page.locator(`[data-cy=category-card]:has-text("${category2Name}")`)).toBeVisible();
    });

    // Switch back to first establishment
    await test.step('Switch back to first establishment', async () => {
      await page.click('[data-cy=establishment-selector]');
      await page.click('[data-cy=establishment-option]:first-child');
      
      await page.waitForLoadState('networkidle');
      
      // Should see first establishment's category
      await expect(page.locator(`[data-cy=category-card]:has-text("${category1Name}")`)).toBeVisible();
      
      // Should not see second establishment's category
      await expect(page.locator(`[data-cy=category-card]:has-text("${category2Name}")`)).not.toBeVisible();
    });
  });

  test('should prevent API manipulation across establishments', async () => {
    let categoryId: string;
    let establishment1Token: string;
    let establishment2Token: string;

    // Get tokens for both establishments
    await test.step('Get authentication tokens', async () => {
      // Get token for establishment 1
      await loginAndSelectEstablishment(establishment1);
      establishment1Token = await page.evaluate(() => localStorage.getItem('auth_token') || '');
      
      // Get token for establishment 2
      await loginAndSelectEstablishment(establishment2);
      establishment2Token = await page.evaluate(() => localStorage.getItem('auth_token') || '');
    });

    // Create category in establishment 1
    await test.step('Create category in establishment 1', async () => {
      await loginAndSelectEstablishment(establishment1);
      await page.goto('/categories');
      
      await page.click('[data-cy=create-category-btn]');
      await page.fill('[data-cy=category-name-input]', `API Test Category ${Date.now()}`);
      await page.fill('[data-cy=category-description-input]', 'Category for API security test');
      await page.click('[data-cy=submit-btn]');
      
      await page.waitForURL('/categories');
      
      // Get category ID from the created category
      await page.click('[data-cy=category-card]:first-child');
      await page.waitForURL(/\/categories\/(\d+)$/);
      
      const url = page.url();
      categoryId = url.match(/\/categories\/(\d+)$/)?.[1] || '';
    });

    // Try to access/modify category from establishment 2 via API
    await test.step('Test API security', async () => {
      await loginAndSelectEstablishment(establishment2);
      
      // Try to make direct API calls to access establishment 1's category
      const response = await page.evaluate(async ({ categoryId, token }) => {
        try {
          const response = await fetch(`/api/categorias/estabelecimentos/1/categorias/${categoryId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          return {
            status: response.status,
            ok: response.ok
          };
        } catch (error) {
          return { error: error.message };
        }
      }, { categoryId, token: establishment2Token });

      // Should receive 403 Forbidden or similar error
      expect(response.status).toBe(403);
      expect(response.ok).toBeFalsy();
    });
  });

  // Helper function to login and select establishment
  async function loginAndSelectEstablishment(establishment: typeof establishment1) {
    await page.goto('/auth/login');
    await page.fill('[data-cy=email-input]', establishment.email);
    await page.fill('[data-cy=password-input]', establishment.password);
    await page.click('[data-cy=login-btn]');
    
    await page.waitForURL('/dashboard');
    await page.click('[data-cy=establishment-selector]');
    
    // Select establishment by name or first available
    const establishmentOption = page.locator(`[data-cy=establishment-option]:has-text("${establishment.establishmentName}")`);
    if (await establishmentOption.count() > 0) {
      await establishmentOption.click();
    } else {
      await page.click('[data-cy=establishment-option]:first-child');
    }
    
    await page.waitForLoadState('networkidle');
  }
});