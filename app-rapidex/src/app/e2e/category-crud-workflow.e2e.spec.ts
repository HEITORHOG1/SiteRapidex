import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Category CRUD Workflows
 * Tests complete create, read, update, delete operations for categories
 * Requirements: All requirements - E2E testing
 */

test.describe('Category CRUD Workflows', () => {
  let page: Page;
  
  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Login as establishment owner
    await page.goto('/auth/login');
    await page.fill('[data-cy=email-input]', 'proprietario@test.com');
    await page.fill('[data-cy=password-input]', 'password123');
    await page.click('[data-cy=login-btn]');
    
    // Wait for authentication and select establishment
    await page.waitForURL('/dashboard');
    await page.click('[data-cy=establishment-selector]');
    await page.click('[data-cy=establishment-option]:first-child');
    
    // Navigate to categories
    await page.goto('/categories');
    await page.waitForLoadState('networkidle');
  });

  test('should complete full CRUD cycle successfully', async () => {
    const categoryName = `Test Category ${Date.now()}`;
    const categoryDescription = 'Test category description for E2E testing';
    const updatedName = `${categoryName} Updated`;
    const updatedDescription = 'Updated description for E2E testing';

    // CREATE: Create new category
    await test.step('Create new category', async () => {
      await page.click('[data-cy=create-category-btn]');
      await page.waitForSelector('[data-cy=category-form]');
      
      await page.fill('[data-cy=category-name-input]', categoryName);
      await page.fill('[data-cy=category-description-input]', categoryDescription);
      
      // Submit form
      await page.click('[data-cy=submit-btn]');
      
      // Verify success message
      await expect(page.locator('[data-cy=success-message]')).toBeVisible();
      await expect(page.locator('[data-cy=success-message]')).toContainText('Categoria criada com sucesso');
      
      // Verify redirect to category list
      await page.waitForURL('/categories');
    });

    // READ: Verify category appears in list
    await test.step('Verify category in list', async () => {
      await page.waitForSelector('[data-cy=category-list]');
      
      // Check category appears in list
      const categoryCard = page.locator(`[data-cy=category-card]:has-text("${categoryName}")`);
      await expect(categoryCard).toBeVisible();
      await expect(categoryCard.locator('[data-cy=category-name]')).toContainText(categoryName);
      await expect(categoryCard.locator('[data-cy=category-description]')).toContainText(categoryDescription);
    });

    // READ: View category details
    await test.step('View category details', async () => {
      const categoryCard = page.locator(`[data-cy=category-card]:has-text("${categoryName}")`);
      await categoryCard.click();
      
      // Verify detail page
      await page.waitForURL(/\/categories\/\d+$/);
      await expect(page.locator('[data-cy=category-detail-name]')).toContainText(categoryName);
      await expect(page.locator('[data-cy=category-detail-description]')).toContainText(categoryDescription);
      
      // Go back to list
      await page.click('[data-cy=back-to-list-btn]');
      await page.waitForURL('/categories');
    });

    // UPDATE: Edit category
    await test.step('Edit category', async () => {
      const categoryCard = page.locator(`[data-cy=category-card]:has-text("${categoryName}")`);
      await categoryCard.locator('[data-cy=edit-category-btn]').click();
      
      // Verify form is pre-filled
      await page.waitForSelector('[data-cy=category-form]');
      await expect(page.locator('[data-cy=category-name-input]')).toHaveValue(categoryName);
      await expect(page.locator('[data-cy=category-description-input]')).toHaveValue(categoryDescription);
      
      // Update fields
      await page.fill('[data-cy=category-name-input]', updatedName);
      await page.fill('[data-cy=category-description-input]', updatedDescription);
      
      // Submit update
      await page.click('[data-cy=submit-btn]');
      
      // Verify success message
      await expect(page.locator('[data-cy=success-message]')).toBeVisible();
      await expect(page.locator('[data-cy=success-message]')).toContainText('Categoria atualizada com sucesso');
      
      // Verify redirect
      await page.waitForURL('/categories');
    });

    // READ: Verify updates
    await test.step('Verify category updates', async () => {
      await page.waitForSelector('[data-cy=category-list]');
      
      const updatedCard = page.locator(`[data-cy=category-card]:has-text("${updatedName}")`);
      await expect(updatedCard).toBeVisible();
      await expect(updatedCard.locator('[data-cy=category-name]')).toContainText(updatedName);
      await expect(updatedCard.locator('[data-cy=category-description]')).toContainText(updatedDescription);
      
      // Verify old name is not present
      await expect(page.locator(`[data-cy=category-card]:has-text("${categoryName}")`)).not.toBeVisible();
    });

    // DELETE: Delete category
    await test.step('Delete category', async () => {
      const categoryCard = page.locator(`[data-cy=category-card]:has-text("${updatedName}")`);
      await categoryCard.locator('[data-cy=delete-category-btn]').click();
      
      // Verify confirmation modal
      await expect(page.locator('[data-cy=delete-confirmation-modal]')).toBeVisible();
      await expect(page.locator('[data-cy=delete-confirmation-text]')).toContainText(updatedName);
      
      // Confirm deletion
      await page.click('[data-cy=confirm-delete-btn]');
      
      // Verify success message
      await expect(page.locator('[data-cy=success-message]')).toBeVisible();
      await expect(page.locator('[data-cy=success-message]')).toContainText('Categoria excluída com sucesso');
    });

    // READ: Verify deletion
    await test.step('Verify category deletion', async () => {
      await page.waitForSelector('[data-cy=category-list]');
      
      // Verify category is no longer in list
      await expect(page.locator(`[data-cy=category-card]:has-text("${updatedName}")`)).not.toBeVisible();
    });
  });

  test('should handle form validation errors', async () => {
    await test.step('Test required field validation', async () => {
      await page.click('[data-cy=create-category-btn]');
      await page.waitForSelector('[data-cy=category-form]');
      
      // Try to submit empty form
      await page.click('[data-cy=submit-btn]');
      
      // Verify validation errors
      await expect(page.locator('[data-cy=name-error]')).toBeVisible();
      await expect(page.locator('[data-cy=name-error]')).toContainText('Nome é obrigatório');
      
      await expect(page.locator('[data-cy=description-error]')).toBeVisible();
      await expect(page.locator('[data-cy=description-error]')).toContainText('Descrição é obrigatória');
    });

    await test.step('Test field length validation', async () => {
      // Test name too short
      await page.fill('[data-cy=category-name-input]', 'A');
      await page.blur('[data-cy=category-name-input]');
      
      await expect(page.locator('[data-cy=name-error]')).toBeVisible();
      await expect(page.locator('[data-cy=name-error]')).toContainText('Nome deve ter pelo menos 2 caracteres');
      
      // Test name too long
      const longName = 'A'.repeat(101);
      await page.fill('[data-cy=category-name-input]', longName);
      await page.blur('[data-cy=category-name-input]');
      
      await expect(page.locator('[data-cy=name-error]')).toBeVisible();
      await expect(page.locator('[data-cy=name-error]')).toContainText('Nome deve ter no máximo 100 caracteres');
      
      // Test description too long
      const longDescription = 'A'.repeat(501);
      await page.fill('[data-cy=category-description-input]', longDescription);
      await page.blur('[data-cy=category-description-input]');
      
      await expect(page.locator('[data-cy=description-error]')).toBeVisible();
      await expect(page.locator('[data-cy=description-error]')).toContainText('Descrição deve ter no máximo 500 caracteres');
    });
  });

  test('should handle duplicate category names', async () => {
    const duplicateName = `Duplicate Category ${Date.now()}`;
    
    // Create first category
    await page.click('[data-cy=create-category-btn]');
    await page.fill('[data-cy=category-name-input]', duplicateName);
    await page.fill('[data-cy=category-description-input]', 'First category');
    await page.click('[data-cy=submit-btn]');
    
    await page.waitForURL('/categories');
    
    // Try to create second category with same name
    await page.click('[data-cy=create-category-btn]');
    await page.fill('[data-cy=category-name-input]', duplicateName);
    await page.fill('[data-cy=category-description-input]', 'Second category');
    await page.click('[data-cy=submit-btn]');
    
    // Verify duplicate name error
    await expect(page.locator('[data-cy=name-error]')).toBeVisible();
    await expect(page.locator('[data-cy=name-error]')).toContainText('Já existe uma categoria com este nome');
  });

  test('should handle category deletion with products', async () => {
    // This test assumes there's a category with associated products
    // In a real scenario, you would set up test data
    
    await test.step('Attempt to delete category with products', async () => {
      // Find a category with products (assuming test data exists)
      const categoryWithProducts = page.locator('[data-cy=category-card]:has([data-cy=product-count]:not(:has-text("0")))').first();
      
      if (await categoryWithProducts.count() > 0) {
        await categoryWithProducts.locator('[data-cy=delete-category-btn]').click();
        
        // Verify warning modal
        await expect(page.locator('[data-cy=delete-warning-modal]')).toBeVisible();
        await expect(page.locator('[data-cy=delete-warning-text]')).toContainText('Esta categoria possui produtos associados');
        
        // Verify deletion is prevented
        await expect(page.locator('[data-cy=confirm-delete-btn]')).toBeDisabled();
        
        // Close modal
        await page.click('[data-cy=cancel-delete-btn]');
        await expect(page.locator('[data-cy=delete-warning-modal]')).not.toBeVisible();
      }
    });
  });
});