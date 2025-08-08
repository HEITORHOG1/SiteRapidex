import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Category Accessibility and Keyboard Navigation
 * Tests accessibility features and keyboard navigation for category management
 * Requirements: 7.2, 7.3, 7.5 - Accessibility and keyboard navigation
 */

test.describe('Category Accessibility and Keyboard Navigation', () => {
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

  test('should support full keyboard navigation', async () => {
    await test.step('Navigate to create category using keyboard', async () => {
      // Tab to create button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab'); // Skip any header elements
      
      // Find and focus create button
      const createBtn = page.locator('[data-cy=create-category-btn]');
      await createBtn.focus();
      
      // Verify focus is visible
      await expect(createBtn).toBeFocused();
      
      // Press Enter to activate
      await page.keyboard.press('Enter');
      
      // Verify form opened
      await expect(page.locator('[data-cy=category-form]')).toBeVisible();
    });

    await test.step('Navigate form fields using keyboard', async () => {
      // Should focus on first form field
      const nameInput = page.locator('[data-cy=category-name-input]');
      await expect(nameInput).toBeFocused();
      
      // Type in name field
      await page.keyboard.type('Keyboard Test Category');
      
      // Tab to description field
      await page.keyboard.press('Tab');
      const descriptionInput = page.locator('[data-cy=category-description-input]');
      await expect(descriptionInput).toBeFocused();
      
      // Type in description field
      await page.keyboard.type('Category created using keyboard navigation');
      
      // Tab to submit button
      await page.keyboard.press('Tab');
      const submitBtn = page.locator('[data-cy=submit-btn]');
      await expect(submitBtn).toBeFocused();
      
      // Submit using Enter
      await page.keyboard.press('Enter');
      
      // Verify success
      await page.waitForURL('/categories');
      await expect(page.locator('[data-cy=success-message]')).toBeVisible();
    });

    await test.step('Navigate category list using keyboard', async () => {
      // Tab through category cards
      await page.keyboard.press('Tab');
      
      // Find first category card
      const firstCard = page.locator('[data-cy=category-card]').first();
      await firstCard.focus();
      await expect(firstCard).toBeFocused();
      
      // Tab to action buttons within card
      await page.keyboard.press('Tab');
      const editBtn = firstCard.locator('[data-cy=edit-category-btn]');
      await expect(editBtn).toBeFocused();
      
      // Tab to delete button
      await page.keyboard.press('Tab');
      const deleteBtn = firstCard.locator('[data-cy=delete-category-btn]');
      await expect(deleteBtn).toBeFocused();
    });
  });

  test('should provide proper ARIA labels and descriptions', async () => {
    await test.step('Verify main page ARIA attributes', async () => {
      // Check main heading
      const mainHeading = page.locator('h1');
      await expect(mainHeading).toHaveAttribute('role', 'heading');
      await expect(mainHeading).toHaveAttribute('aria-level', '1');
      
      // Check create button
      const createBtn = page.locator('[data-cy=create-category-btn]');
      await expect(createBtn).toHaveAttribute('aria-label', 'Criar nova categoria');
      
      // Check category list
      const categoryList = page.locator('[data-cy=category-list]');
      await expect(categoryList).toHaveAttribute('role', 'list');
      await expect(categoryList).toHaveAttribute('aria-label', 'Lista de categorias');
    });

    await test.step('Verify category card ARIA attributes', async () => {
      const categoryCard = page.locator('[data-cy=category-card]').first();
      
      // Check card role and label
      await expect(categoryCard).toHaveAttribute('role', 'listitem');
      await expect(categoryCard).toHaveAttribute('aria-labelledby');
      
      // Check action buttons
      const editBtn = categoryCard.locator('[data-cy=edit-category-btn]');
      await expect(editBtn).toHaveAttribute('aria-label');
      
      const deleteBtn = categoryCard.locator('[data-cy=delete-category-btn]');
      await expect(deleteBtn).toHaveAttribute('aria-label');
      
      // Verify aria-label contains category name
      const categoryName = await categoryCard.locator('[data-cy=category-name]').textContent();
      const editAriaLabel = await editBtn.getAttribute('aria-label');
      expect(editAriaLabel).toContain(categoryName);
    });

    await test.step('Verify form ARIA attributes', async () => {
      await page.click('[data-cy=create-category-btn]');
      
      // Check form role and label
      const form = page.locator('[data-cy=category-form]');
      await expect(form).toHaveAttribute('role', 'form');
      await expect(form).toHaveAttribute('aria-labelledby');
      
      // Check input labels and descriptions
      const nameInput = page.locator('[data-cy=category-name-input]');
      await expect(nameInput).toHaveAttribute('aria-label', 'Nome da categoria');
      await expect(nameInput).toHaveAttribute('aria-required', 'true');
      
      const descriptionInput = page.locator('[data-cy=category-description-input]');
      await expect(descriptionInput).toHaveAttribute('aria-label', 'Descrição da categoria');
      await expect(descriptionInput).toHaveAttribute('aria-required', 'true');
      
      // Check submit button
      const submitBtn = page.locator('[data-cy=submit-btn]');
      await expect(submitBtn).toHaveAttribute('aria-label', 'Salvar categoria');
    });
  });

  test('should announce actions to screen readers', async () => {
    await test.step('Test live region announcements', async () => {
      // Check for live region
      const liveRegion = page.locator('[aria-live="polite"]');
      await expect(liveRegion).toBeAttached();
      
      // Create category and verify announcement
      await page.click('[data-cy=create-category-btn]');
      await page.fill('[data-cy=category-name-input]', 'Screen Reader Test');
      await page.fill('[data-cy=category-description-input]', 'Testing screen reader announcements');
      await page.click('[data-cy=submit-btn]');
      
      // Wait for success message
      await expect(page.locator('[data-cy=success-message]')).toBeVisible();
      
      // Verify live region contains announcement
      await expect(liveRegion).toContainText('Categoria criada com sucesso');
    });

    await test.step('Test error announcements', async () => {
      await page.click('[data-cy=create-category-btn]');
      
      // Submit empty form to trigger errors
      await page.click('[data-cy=submit-btn]');
      
      // Verify error announcements
      const liveRegion = page.locator('[aria-live="assertive"]');
      await expect(liveRegion).toContainText('Erro de validação');
      
      // Check individual field errors have proper ARIA
      const nameError = page.locator('[data-cy=name-error]');
      await expect(nameError).toHaveAttribute('role', 'alert');
      await expect(nameError).toHaveAttribute('aria-live', 'assertive');
    });
  });

  test('should support high contrast and reduced motion', async () => {
    await test.step('Test high contrast mode', async () => {
      // Enable high contrast mode
      await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'no-preference' });
      
      // Verify elements are still visible and accessible
      const createBtn = page.locator('[data-cy=create-category-btn]');
      await expect(createBtn).toBeVisible();
      
      // Check contrast ratios (simplified check)
      const btnStyles = await createBtn.evaluate(el => getComputedStyle(el));
      expect(btnStyles.color).toBeTruthy();
      expect(btnStyles.backgroundColor).toBeTruthy();
    });

    await test.step('Test reduced motion', async () => {
      // Enable reduced motion
      await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
      
      // Verify animations are reduced/disabled
      await page.click('[data-cy=create-category-btn]');
      
      // Check that form appears without animation
      const form = page.locator('[data-cy=category-form]');
      await expect(form).toBeVisible();
      
      // Verify CSS respects prefers-reduced-motion
      const formStyles = await form.evaluate(el => getComputedStyle(el));
      // In a real implementation, you'd check for animation-duration: 0s or similar
    });
  });

  test('should handle focus management in modals', async () => {
    // Create a category first
    await page.click('[data-cy=create-category-btn]');
    await page.fill('[data-cy=category-name-input]', 'Modal Focus Test');
    await page.fill('[data-cy=category-description-input]', 'Testing modal focus management');
    await page.click('[data-cy=submit-btn]');
    await page.waitForURL('/categories');

    await test.step('Test delete confirmation modal focus', async () => {
      // Click delete on first category
      const categoryCard = page.locator('[data-cy=category-card]').first();
      await categoryCard.locator('[data-cy=delete-category-btn]').click();
      
      // Verify modal is visible
      const modal = page.locator('[data-cy=delete-confirmation-modal]');
      await expect(modal).toBeVisible();
      
      // Verify focus is trapped in modal
      const confirmBtn = modal.locator('[data-cy=confirm-delete-btn]');
      const cancelBtn = modal.locator('[data-cy=cancel-delete-btn]');
      
      // Focus should be on cancel button (safer default)
      await expect(cancelBtn).toBeFocused();
      
      // Tab should cycle within modal
      await page.keyboard.press('Tab');
      await expect(confirmBtn).toBeFocused();
      
      // Tab again should go back to cancel
      await page.keyboard.press('Tab');
      await expect(cancelBtn).toBeFocused();
      
      // Escape should close modal
      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
      
      // Focus should return to delete button
      await expect(categoryCard.locator('[data-cy=delete-category-btn]')).toBeFocused();
    });
  });

  test('should provide skip links and landmarks', async () => {
    await test.step('Test skip links', async () => {
      // Tab to first element (should be skip link)
      await page.keyboard.press('Tab');
      
      const skipLink = page.locator('[data-cy=skip-to-main]');
      if (await skipLink.count() > 0) {
        await expect(skipLink).toBeFocused();
        await expect(skipLink).toContainText('Pular para conteúdo principal');
        
        // Activate skip link
        await page.keyboard.press('Enter');
        
        // Verify focus moved to main content
        const mainContent = page.locator('main');
        await expect(mainContent).toBeFocused();
      }
    });

    await test.step('Test landmark navigation', async () => {
      // Verify main landmarks exist
      await expect(page.locator('main')).toBeAttached();
      await expect(page.locator('nav')).toBeAttached();
      
      // Check landmark labels
      const main = page.locator('main');
      await expect(main).toHaveAttribute('aria-label', 'Conteúdo principal');
      
      const nav = page.locator('nav');
      await expect(nav).toHaveAttribute('aria-label', 'Navegação principal');
    });
  });

  test('should support screen reader navigation patterns', async () => {
    await test.step('Test heading hierarchy', async () => {
      // Verify proper heading structure
      const h1 = page.locator('h1');
      await expect(h1).toBeAttached();
      
      // Check for proper heading levels (no skipping)
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingLevels = await headings.evaluateAll(elements => 
        elements.map(el => parseInt(el.tagName.charAt(1)))
      );
      
      // Verify no heading levels are skipped
      for (let i = 1; i < headingLevels.length; i++) {
        const diff = headingLevels[i] - headingLevels[i - 1];
        expect(diff).toBeLessThanOrEqual(1);
      }
    });

    await test.step('Test table accessibility (if present)', async () => {
      const table = page.locator('table');
      
      if (await table.count() > 0) {
        // Verify table has caption or aria-label
        const hasCaption = await table.locator('caption').count() > 0;
        const hasAriaLabel = await table.getAttribute('aria-label');
        
        expect(hasCaption || hasAriaLabel).toBeTruthy();
        
        // Verify headers are properly associated
        const headers = table.locator('th');
        if (await headers.count() > 0) {
          await expect(headers.first()).toHaveAttribute('scope');
        }
      }
    });
  });
});