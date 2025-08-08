import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Category Error Handling and Recovery Flows
 * Tests error scenarios and recovery mechanisms
 * Requirements: All requirements - Error handling and recovery
 */

test.describe('Category Error Handling and Recovery', () => {
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

  test('should handle network errors gracefully', async () => {
    await test.step('Test offline scenario', async () => {
      // Simulate offline condition
      await page.context().setOffline(true);
      
      // Try to create category while offline
      await page.click('[data-cy=create-category-btn]');
      await page.fill('[data-cy=category-name-input]', 'Offline Test Category');
      await page.fill('[data-cy=category-description-input]', 'Testing offline functionality');
      await page.click('[data-cy=submit-btn]');
      
      // Should show offline message or queue operation
      const offlineMessage = page.locator('[data-cy=offline-message]');
      const queuedMessage = page.locator('[data-cy=queued-operation-message]');
      
      const hasOfflineIndicator = await offlineMessage.isVisible() || await queuedMessage.isVisible();
      expect(hasOfflineIndicator).toBeTruthy();
      
      // Verify operation is queued for later
      if (await queuedMessage.isVisible()) {
        await expect(queuedMessage).toContainText('Operação será executada quando a conexão for restaurada');
      }
    });

    await test.step('Test connection recovery', async () => {
      // Restore connection
      await page.context().setOffline(false);
      
      // Wait for connection recovery
      await page.waitForTimeout(2000);
      
      // Should show connection restored message
      const connectionRestoredMessage = page.locator('[data-cy=connection-restored-message]');
      if (await connectionRestoredMessage.isVisible()) {
        await expect(connectionRestoredMessage).toContainText('Conexão restaurada');
      }
      
      // Queued operations should be processed
      const syncingMessage = page.locator('[data-cy=syncing-message]');
      if (await syncingMessage.isVisible()) {
        await expect(syncingMessage).toContainText('Sincronizando dados');
        
        // Wait for sync to complete
        await expect(syncingMessage).not.toBeVisible({ timeout: 10000 });
      }
    });

    await test.step('Test retry mechanism', async () => {
      // Simulate network error during operation
      await page.route('**/api/categorias/**', route => {
        route.abort('failed');
      });
      
      await page.click('[data-cy=create-category-btn]');
      await page.fill('[data-cy=category-name-input]', 'Retry Test Category');
      await page.fill('[data-cy=category-description-input]', 'Testing retry mechanism');
      await page.click('[data-cy=submit-btn]');
      
      // Should show error message with retry option
      const errorMessage = page.locator('[data-cy=error-message]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('Erro de conexão');
      
      const retryBtn = page.locator('[data-cy=retry-btn]');
      await expect(retryBtn).toBeVisible();
      
      // Remove network simulation
      await page.unroute('**/api/categorias/**');
      
      // Click retry
      await retryBtn.click();
      
      // Should succeed on retry
      await page.waitForURL('/categories');
      await expect(page.locator('[data-cy=success-message]')).toBeVisible();
    });
  });

  test('should handle server errors appropriately', async () => {
    await test.step('Test 500 internal server error', async () => {
      // Mock 500 error
      await page.route('**/api/categorias/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ 
            error: 'Internal Server Error',
            message: 'Erro interno do servidor'
          })
        });
      });
      
      await page.click('[data-cy=create-category-btn]');
      await page.fill('[data-cy=category-name-input]', 'Server Error Test');
      await page.fill('[data-cy=category-description-input]', 'Testing server error handling');
      await page.click('[data-cy=submit-btn]');
      
      // Should show appropriate error message
      const errorMessage = page.locator('[data-cy=error-message]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('Erro interno do servidor');
      
      // Should provide contact support option
      const supportBtn = page.locator('[data-cy=contact-support-btn]');
      if (await supportBtn.isVisible()) {
        await expect(supportBtn).toContainText('Contatar suporte');
      }
      
      await page.unroute('**/api/categorias/**');
    });

    await test.step('Test 403 forbidden error', async () => {
      // Mock 403 error
      await page.route('**/api/categorias/**', route => {
        route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ 
            error: 'Forbidden',
            message: 'Acesso negado'
          })
        });
      });
      
      await page.click('[data-cy=create-category-btn]');
      await page.fill('[data-cy=category-name-input]', 'Forbidden Test');
      await page.fill('[data-cy=category-description-input]', 'Testing forbidden error');
      await page.click('[data-cy=submit-btn]');
      
      // Should show access denied message
      const errorMessage = page.locator('[data-cy=error-message]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('Acesso negado');
      
      // Should suggest re-authentication
      const reloginBtn = page.locator('[data-cy=relogin-btn]');
      if (await reloginBtn.isVisible()) {
        await expect(reloginBtn).toContainText('Fazer login novamente');
      }
      
      await page.unroute('**/api/categorias/**');
    });

    await test.step('Test 404 not found error', async () => {
      // Create a category first
      await page.click('[data-cy=create-category-btn]');
      await page.fill('[data-cy=category-name-input]', 'Test Category for 404');
      await page.fill('[data-cy=category-description-input]', 'Will be used for 404 test');
      await page.click('[data-cy=submit-btn]');
      await page.waitForURL('/categories');
      
      // Mock 404 error for specific category
      await page.route('**/api/categorias/**/1', route => {
        route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ 
            error: 'Not Found',
            message: 'Categoria não encontrada'
          })
        });
      });
      
      // Try to access non-existent category
      await page.goto('/categories/1');
      
      // Should show not found message
      const errorMessage = page.locator('[data-cy=error-message]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('Categoria não encontrada');
      
      // Should provide navigation back to list
      const backToListBtn = page.locator('[data-cy=back-to-list-btn]');
      await expect(backToListBtn).toBeVisible();
      
      await backToListBtn.click();
      await page.waitForURL('/categories');
      
      await page.unroute('**/api/categorias/**/1');
    });
  });

  test('should handle validation errors with recovery', async () => {
    await test.step('Test form validation recovery', async () => {
      await page.click('[data-cy=create-category-btn]');
      
      // Submit empty form
      await page.click('[data-cy=submit-btn]');
      
      // Should show validation errors
      await expect(page.locator('[data-cy=name-error]')).toBeVisible();
      await expect(page.locator('[data-cy=description-error]')).toBeVisible();
      
      // Fix validation errors
      await page.fill('[data-cy=category-name-input]', 'Valid Category Name');
      
      // Name error should disappear
      await expect(page.locator('[data-cy=name-error]')).not.toBeVisible();
      
      // Description error should still be visible
      await expect(page.locator('[data-cy=description-error]')).toBeVisible();
      
      // Fix description
      await page.fill('[data-cy=category-description-input]', 'Valid description');
      
      // All errors should be gone
      await expect(page.locator('[data-cy=name-error]')).not.toBeVisible();
      await expect(page.locator('[data-cy=description-error]')).not.toBeVisible();
      
      // Submit should now work
      await page.click('[data-cy=submit-btn]');
      await page.waitForURL('/categories');
      await expect(page.locator('[data-cy=success-message]')).toBeVisible();
    });

    await test.step('Test server-side validation errors', async () => {
      // Mock server validation error
      await page.route('**/api/categorias/**', route => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ 
              error: 'Validation Error',
              message: 'Nome da categoria já existe',
              field: 'nome'
            })
          });
        } else {
          route.continue();
        }
      });
      
      await page.click('[data-cy=create-category-btn]');
      await page.fill('[data-cy=category-name-input]', 'Duplicate Name');
      await page.fill('[data-cy=category-description-input]', 'Testing duplicate validation');
      await page.click('[data-cy=submit-btn]');
      
      // Should show server validation error
      const nameError = page.locator('[data-cy=name-error]');
      await expect(nameError).toBeVisible();
      await expect(nameError).toContainText('Nome da categoria já existe');
      
      // Fix the error
      await page.fill('[data-cy=category-name-input]', 'Unique Name');
      
      await page.unroute('**/api/categorias/**');
      
      // Submit should now work
      await page.click('[data-cy=submit-btn]');
      await page.waitForURL('/categories');
      await expect(page.locator('[data-cy=success-message]')).toBeVisible();
    });
  });

  test('should handle concurrent modification conflicts', async () => {
    let categoryId: string;
    
    await test.step('Create category for conflict test', async () => {
      await page.click('[data-cy=create-category-btn]');
      await page.fill('[data-cy=category-name-input]', 'Conflict Test Category');
      await page.fill('[data-cy=category-description-input]', 'Testing conflict resolution');
      await page.click('[data-cy=submit-btn]');
      
      await page.waitForURL('/categories');
      
      // Get category ID
      await page.click('[data-cy=category-card]:first-child');
      await page.waitForURL(/\/categories\/(\d+)$/);
      
      const url = page.url();
      categoryId = url.match(/\/categories\/(\d+)$/)?.[1] || '';
      
      await page.goto('/categories');
    });

    await test.step('Test optimistic update conflict', async () => {
      // Start editing
      const categoryCard = page.locator('[data-cy=category-card]').first();
      await categoryCard.locator('[data-cy=edit-category-btn]').click();
      
      // Mock conflict error (409)
      await page.route(`**/api/categorias/**/${categoryId}`, route => {
        if (route.request().method() === 'PUT') {
          route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({ 
              error: 'Conflict',
              message: 'A categoria foi modificada por outro usuário',
              currentVersion: {
                nome: 'Modified by Another User',
                descricao: 'This was changed by someone else'
              }
            })
          });
        } else {
          route.continue();
        }
      });
      
      // Make changes
      await page.fill('[data-cy=category-name-input]', 'My Changes');
      await page.fill('[data-cy=category-description-input]', 'My description changes');
      await page.click('[data-cy=submit-btn]');
      
      // Should show conflict resolution dialog
      const conflictModal = page.locator('[data-cy=conflict-resolution-modal]');
      await expect(conflictModal).toBeVisible();
      
      // Should show both versions
      await expect(conflictModal.locator('[data-cy=my-version]')).toContainText('My Changes');
      await expect(conflictModal.locator('[data-cy=server-version]')).toContainText('Modified by Another User');
      
      // Choose to keep my version
      await conflictModal.locator('[data-cy=keep-my-version-btn]').click();
      
      await page.unroute(`**/api/categorias/**/${categoryId}`);
      
      // Should retry with force flag
      await page.waitForURL('/categories');
      await expect(page.locator('[data-cy=success-message]')).toBeVisible();
    });
  });

  test('should handle session expiration gracefully', async () => {
    await test.step('Test expired token handling', async () => {
      // Mock 401 unauthorized
      await page.route('**/api/categorias/**', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ 
            error: 'Unauthorized',
            message: 'Token expirado'
          })
        });
      });
      
      await page.click('[data-cy=create-category-btn]');
      await page.fill('[data-cy=category-name-input]', 'Session Test');
      await page.fill('[data-cy=category-description-input]', 'Testing session expiration');
      await page.click('[data-cy=submit-btn]');
      
      // Should redirect to login or show session expired message
      const sessionExpiredModal = page.locator('[data-cy=session-expired-modal]');
      
      if (await sessionExpiredModal.isVisible()) {
        await expect(sessionExpiredModal).toContainText('Sua sessão expirou');
        
        const reloginBtn = sessionExpiredModal.locator('[data-cy=relogin-btn]');
        await reloginBtn.click();
      }
      
      // Should be redirected to login
      await page.waitForURL('/auth/login');
      
      await page.unroute('**/api/categorias/**');
    });
  });

  test('should provide error reporting functionality', async () => {
    await test.step('Test error reporting', async () => {
      // Mock unexpected error
      await page.route('**/api/categorias/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'text/html',
          body: '<html><body>Unexpected server error</body></html>'
        });
      });
      
      await page.click('[data-cy=create-category-btn]');
      await page.fill('[data-cy=category-name-input]', 'Error Report Test');
      await page.fill('[data-cy=category-description-input]', 'Testing error reporting');
      await page.click('[data-cy=submit-btn]');
      
      // Should show error with report option
      const errorMessage = page.locator('[data-cy=error-message]');
      await expect(errorMessage).toBeVisible();
      
      const reportErrorBtn = page.locator('[data-cy=report-error-btn]');
      if (await reportErrorBtn.isVisible()) {
        await reportErrorBtn.click();
        
        // Should open error report modal
        const reportModal = page.locator('[data-cy=error-report-modal]');
        await expect(reportModal).toBeVisible();
        
        // Should have pre-filled error details
        const errorDetails = reportModal.locator('[data-cy=error-details]');
        await expect(errorDetails).not.toBeEmpty();
        
        // User can add additional context
        await reportModal.locator('[data-cy=user-context-input]').fill('I was trying to create a new category');
        
        // Submit report
        await reportModal.locator('[data-cy=submit-report-btn]').click();
        
        // Should show confirmation
        await expect(page.locator('[data-cy=report-sent-message]')).toBeVisible();
      }
      
      await page.unroute('**/api/categorias/**');
    });
  });
});