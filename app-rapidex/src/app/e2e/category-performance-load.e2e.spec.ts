import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Category Performance and Load Testing
 * Tests performance characteristics and load handling
 * Requirements: 9.1, 9.2, 9.3, 9.6 - Performance optimization
 */

test.describe('Category Performance and Load Testing', () => {
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
  });

  test('should load category list efficiently', async () => {
    await test.step('Measure initial page load performance', async () => {
      const startTime = Date.now();
      
      await page.goto('/categories');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time (adjust threshold as needed)
      expect(loadTime).toBeLessThan(3000); // 3 seconds
      
      // Verify content is loaded
      await expect(page.locator('[data-cy=category-list]')).toBeVisible();
    });

    await test.step('Test lazy loading with large datasets', async () => {
      // Mock large dataset response
      await page.route('**/api/categorias/**', route => {
        const categories = Array.from({ length: 100 }, (_, i) => ({
          id: i + 1,
          nome: `Categoria ${i + 1}`,
          descricao: `Descrição da categoria ${i + 1}`,
          estabelecimentoId: 1,
          ativo: true,
          dataCriacao: new Date().toISOString(),
          dataAtualizacao: new Date().toISOString(),
          produtosCount: Math.floor(Math.random() * 50)
        }));
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            categorias: categories.slice(0, 20), // First page
            total: 100,
            pagina: 1,
            totalPaginas: 5
          })
        });
      });
      
      await page.goto('/categories');
      await page.waitForLoadState('networkidle');
      
      // Should show pagination or infinite scroll
      const pagination = page.locator('[data-cy=pagination]');
      const loadMoreBtn = page.locator('[data-cy=load-more-btn]');
      
      const hasPagination = await pagination.isVisible();
      const hasLoadMore = await loadMoreBtn.isVisible();
      
      expect(hasPagination || hasLoadMore).toBeTruthy();
      
      // Should only render visible items initially
      const categoryCards = page.locator('[data-cy=category-card]');
      const cardCount = await categoryCards.count();
      
      // Should not render all 100 items at once
      expect(cardCount).toBeLessThanOrEqual(20);
      
      await page.unroute('**/api/categorias/**');
    });

    await test.step('Test virtual scrolling performance', async () => {
      // If virtual scrolling is implemented
      const virtualContainer = page.locator('[data-cy=virtual-scroll-container]');
      
      if (await virtualContainer.isVisible()) {
        // Scroll through large list
        for (let i = 0; i < 10; i++) {
          await page.mouse.wheel(0, 500);
          await page.waitForTimeout(100);
        }
        
        // Should maintain smooth scrolling
        const scrollTop = await virtualContainer.evaluate(el => el.scrollTop);
        expect(scrollTop).toBeGreaterThan(0);
        
        // Should not have rendered all items
        const renderedItems = await virtualContainer.locator('[data-cy=category-card]').count();
        expect(renderedItems).toBeLessThan(100);
      }
    });
  });

  test('should handle search performance efficiently', async () => {
    await test.step('Test search debouncing', async () => {
      await page.goto('/categories');
      await page.waitForLoadState('networkidle');
      
      const searchInput = page.locator('[data-cy=search-input]');
      
      // Track network requests
      let requestCount = 0;
      page.on('request', request => {
        if (request.url().includes('/api/categorias/') && request.url().includes('search')) {
          requestCount++;
        }
      });
      
      // Type quickly (should be debounced)
      await searchInput.fill('test');
      await page.waitForTimeout(100);
      await searchInput.fill('testing');
      await page.waitForTimeout(100);
      await searchInput.fill('testing category');
      
      // Wait for debounce period
      await page.waitForTimeout(1000);
      
      // Should have made only one request due to debouncing
      expect(requestCount).toBeLessThanOrEqual(1);
    });

    await test.step('Test search result caching', async () => {
      const searchInput = page.locator('[data-cy=search-input]');
      
      // Perform search
      await searchInput.fill('bebidas');
      await page.waitForLoadState('networkidle');
      
      // Clear and search again with same term
      await searchInput.fill('');
      await page.waitForTimeout(500);
      
      let cachedRequestMade = false;
      page.on('request', request => {
        if (request.url().includes('bebidas')) {
          cachedRequestMade = true;
        }
      });
      
      await searchInput.fill('bebidas');
      await page.waitForTimeout(1000);
      
      // Should use cached results (no new request)
      expect(cachedRequestMade).toBeFalsy();
    });
  });

  test('should optimize form interactions', async () => {
    await test.step('Test form rendering performance', async () => {
      await page.goto('/categories');
      
      const startTime = Date.now();
      await page.click('[data-cy=create-category-btn]');
      await page.waitForSelector('[data-cy=category-form]');
      
      const renderTime = Date.now() - startTime;
      
      // Form should render quickly
      expect(renderTime).toBeLessThan(500); // 500ms
    });

    await test.step('Test form validation performance', async () => {
      await page.click('[data-cy=create-category-btn]');
      
      const nameInput = page.locator('[data-cy=category-name-input]');
      
      // Test rapid input changes
      const startTime = Date.now();
      
      for (let i = 0; i < 10; i++) {
        await nameInput.fill(`test${i}`);
        await page.waitForTimeout(50);
      }
      
      const validationTime = Date.now() - startTime;
      
      // Validation should be responsive
      expect(validationTime).toBeLessThan(2000); // 2 seconds for 10 changes
    });

    await test.step('Test async validation performance', async () => {
      await page.click('[data-cy=create-category-btn]');
      
      const nameInput = page.locator('[data-cy=category-name-input]');
      
      // Mock slow async validation
      await page.route('**/api/categorias/**/validate-name', route => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ valid: true })
          });
        }, 200); // 200ms delay
      });
      
      const startTime = Date.now();
      await nameInput.fill('unique-category-name');
      await nameInput.blur();
      
      // Wait for validation to complete
      await page.waitForFunction(() => {
        const input = document.querySelector('[data-cy=category-name-input]');
        return input && !input.classList.contains('validating');
      });
      
      const validationTime = Date.now() - startTime;
      
      // Should complete within reasonable time
      expect(validationTime).toBeLessThan(1000); // 1 second
      
      await page.unroute('**/api/categorias/**/validate-name');
    });
  });

  test('should handle concurrent operations efficiently', async () => {
    await test.step('Test multiple simultaneous requests', async () => {
      await page.goto('/categories');
      await page.waitForLoadState('networkidle');
      
      // Track request timing
      const requestTimes: number[] = [];
      
      page.on('response', response => {
        if (response.url().includes('/api/categorias/')) {
          requestTimes.push(Date.now());
        }
      });
      
      // Trigger multiple operations simultaneously
      const promises = [
        page.click('[data-cy=create-category-btn]'),
        page.locator('[data-cy=search-input]').fill('test'),
        page.locator('[data-cy=filter-active]').click()
      ];
      
      await Promise.all(promises);
      await page.waitForLoadState('networkidle');
      
      // Requests should be handled efficiently
      expect(requestTimes.length).toBeGreaterThan(0);
      
      // No request should take too long
      for (let i = 1; i < requestTimes.length; i++) {
        const timeDiff = requestTimes[i] - requestTimes[i - 1];
        expect(timeDiff).toBeLessThan(5000); // 5 seconds max between requests
      }
    });

    await test.step('Test optimistic updates performance', async () => {
      // Create a category first
      await page.goto('/categories');
      await page.click('[data-cy=create-category-btn]');
      await page.fill('[data-cy=category-name-input]', 'Optimistic Test');
      await page.fill('[data-cy=category-description-input]', 'Testing optimistic updates');
      await page.click('[data-cy=submit-btn]');
      await page.waitForURL('/categories');
      
      // Edit the category
      const categoryCard = page.locator('[data-cy=category-card]').first();
      await categoryCard.locator('[data-cy=edit-category-btn]').click();
      
      // Mock slow server response
      await page.route('**/api/categorias/**', route => {
        if (route.request().method() === 'PUT') {
          setTimeout(() => {
            route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                id: 1,
                nome: 'Updated Optimistic Test',
                descricao: 'Updated description',
                estabelecimentoId: 1,
                ativo: true,
                dataCriacao: new Date().toISOString(),
                dataAtualizacao: new Date().toISOString()
              })
            });
          }, 2000); // 2 second delay
        } else {
          route.continue();
        }
      });
      
      // Make changes
      await page.fill('[data-cy=category-name-input]', 'Updated Optimistic Test');
      await page.fill('[data-cy=category-description-input]', 'Updated description');
      
      const startTime = Date.now();
      await page.click('[data-cy=submit-btn]');
      
      // Should show optimistic update immediately
      await page.waitForURL('/categories');
      const optimisticTime = Date.now() - startTime;
      
      // Should redirect quickly (optimistic update)
      expect(optimisticTime).toBeLessThan(1000); // 1 second
      
      // Should show updated content immediately
      await expect(page.locator('[data-cy=category-card]:has-text("Updated Optimistic Test")')).toBeVisible();
      
      await page.unroute('**/api/categorias/**');
    });
  });

  test('should handle memory usage efficiently', async () => {
    await test.step('Test memory usage with large datasets', async () => {
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      
      // Load large dataset
      await page.route('**/api/categorias/**', route => {
        const categories = Array.from({ length: 1000 }, (_, i) => ({
          id: i + 1,
          nome: `Categoria ${i + 1}`,
          descricao: `Descrição muito longa da categoria ${i + 1} com muitos detalhes e informações adicionais`,
          estabelecimentoId: 1,
          ativo: true,
          dataCriacao: new Date().toISOString(),
          dataAtualizacao: new Date().toISOString(),
          produtosCount: Math.floor(Math.random() * 100)
        }));
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            categorias: categories,
            total: 1000,
            pagina: 1,
            totalPaginas: 1
          })
        });
      });
      
      await page.goto('/categories');
      await page.waitForLoadState('networkidle');
      
      // Get memory usage after loading
      const afterLoadMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      
      // Memory increase should be reasonable
      const memoryIncrease = afterLoadMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
      
      // Should not use excessive memory (adjust threshold as needed)
      expect(memoryIncreaseMB).toBeLessThan(50); // 50MB increase max
      
      await page.unroute('**/api/categorias/**');
    });

    await test.step('Test memory cleanup on navigation', async () => {
      await page.goto('/categories');
      await page.waitForLoadState('networkidle');
      
      // Get memory after loading categories
      const categoriesMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      
      // Navigate away
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Force garbage collection if available
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });
      
      // Get memory after navigation
      const afterNavigationMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      
      // Memory should be cleaned up (some tolerance for other operations)
      const memoryDifference = categoriesMemory - afterNavigationMemory;
      const memoryDifferenceMB = Math.abs(memoryDifference) / (1024 * 1024);
      
      // Should have cleaned up most memory
      expect(memoryDifferenceMB).toBeLessThan(10); // 10MB tolerance
    });
  });

  test('should handle network conditions gracefully', async () => {
    await test.step('Test slow network performance', async () => {
      // Simulate slow network
      await page.route('**/api/categorias/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        route.continue();
      });
      
      const startTime = Date.now();
      await page.goto('/categories');
      
      // Should show loading state
      await expect(page.locator('[data-cy=loading-spinner]')).toBeVisible();
      
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // Should handle slow network gracefully
      expect(loadTime).toBeGreaterThan(2000); // Confirms delay was applied
      expect(loadTime).toBeLessThan(10000); // But not hang indefinitely
      
      // Content should eventually load
      await expect(page.locator('[data-cy=category-list]')).toBeVisible();
      
      await page.unroute('**/api/categorias/**');
    });

    await test.step('Test request timeout handling', async () => {
      // Mock request that never responds
      await page.route('**/api/categorias/**', route => {
        // Don't fulfill or continue - simulate timeout
      });
      
      const startTime = Date.now();
      await page.goto('/categories');
      
      // Should show timeout error within reasonable time
      await expect(page.locator('[data-cy=timeout-error]')).toBeVisible({ timeout: 30000 });
      
      const timeoutTime = Date.now() - startTime;
      
      // Should timeout within reasonable period
      expect(timeoutTime).toBeLessThan(30000); // 30 seconds max
      
      await page.unroute('**/api/categorias/**');
    });
  });

  test('should optimize bundle size and loading', async () => {
    await test.step('Test lazy loading of category module', async () => {
      // Navigate to app root
      await page.goto('/dashboard');
      
      // Monitor network requests
      const networkRequests: string[] = [];
      page.on('request', request => {
        if (request.url().includes('.js')) {
          networkRequests.push(request.url());
        }
      });
      
      // Navigate to categories (should trigger lazy loading)
      await page.goto('/categories');
      await page.waitForLoadState('networkidle');
      
      // Should have loaded category-specific chunks
      const categoryChunks = networkRequests.filter(url => 
        url.includes('categories') || url.includes('category')
      );
      
      expect(categoryChunks.length).toBeGreaterThan(0);
    });

    await test.step('Test code splitting effectiveness', async () => {
      // Check that category code is not loaded on other pages
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Get loaded scripts
      const dashboardScripts = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('script[src]'))
          .map(script => (script as HTMLScriptElement).src);
      });
      
      // Category-specific code should not be loaded
      const hasCategoryCode = dashboardScripts.some(src => 
        src.includes('categories') || src.includes('category')
      );
      
      expect(hasCategoryCode).toBeFalsy();
    });
  });
});