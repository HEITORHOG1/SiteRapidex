import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for E2E tests
 * Prepares test environment and data
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test global setup...');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Setup test data
    await setupTestData(page);
    
    // Verify application is running
    await verifyApplication(page);
    
    console.log('✅ Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function setupTestData(page: any) {
  console.log('📊 Setting up test data...');
  
  // Create test establishments and users
  const testData = {
    establishments: [
      {
        id: 1,
        nome: 'Estabelecimento 1',
        proprietarioEmail: 'proprietario1@test.com'
      },
      {
        id: 2,
        nome: 'Estabelecimento 2',
        proprietarioEmail: 'proprietario2@test.com'
      }
    ],
    users: [
      {
        email: 'proprietario@test.com',
        password: 'password123',
        establishments: [1]
      },
      {
        email: 'proprietario1@test.com',
        password: 'password123',
        establishments: [1]
      },
      {
        email: 'proprietario2@test.com',
        password: 'password123',
        establishments: [2]
      },
      {
        email: 'multi.establishment@test.com',
        password: 'password123',
        establishments: [1, 2]
      }
    ],
    categories: [
      {
        id: 1,
        nome: 'Bebidas',
        descricao: 'Categoria de bebidas',
        estabelecimentoId: 1,
        produtosCount: 5
      },
      {
        id: 2,
        nome: 'Comidas',
        descricao: 'Categoria de comidas',
        estabelecimentoId: 1,
        produtosCount: 0
      },
      {
        id: 3,
        nome: 'Sobremesas',
        descricao: 'Categoria de sobremesas',
        estabelecimentoId: 2,
        produtosCount: 3
      }
    ]
  };
  
  // In a real scenario, you would make API calls to setup test data
  // For now, we'll store it in localStorage for mock purposes
  await page.goto('http://localhost:4200');
  await page.evaluate((data) => {
    localStorage.setItem('e2e-test-data', JSON.stringify(data));
  }, testData);
  
  console.log('✅ Test data setup completed');
}

async function verifyApplication(page: any) {
  console.log('🔍 Verifying application is running...');
  
  try {
    await page.goto('http://localhost:4200');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Check if the app loaded successfully
    const title = await page.title();
    if (!title || title.includes('Error')) {
      throw new Error('Application failed to load properly');
    }
    
    console.log('✅ Application verification completed');
  } catch (error) {
    console.error('❌ Application verification failed:', error);
    throw error;
  }
}

export default globalSetup;