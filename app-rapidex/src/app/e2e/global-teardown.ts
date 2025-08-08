import { chromium, FullConfig } from '@playwright/test';

/**
 * Global teardown for E2E tests
 * Cleans up test environment and data
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E test global teardown...');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Cleanup test data
    await cleanupTestData(page);
    
    // Generate test report summary
    await generateTestSummary();
    
    console.log('✅ Global teardown completed successfully');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error in teardown to avoid masking test failures
  } finally {
    await browser.close();
  }
}

async function cleanupTestData(page: any) {
  console.log('🗑️ Cleaning up test data...');
  
  try {
    await page.goto('http://localhost:4200');
    
    // Clear test data from localStorage
    await page.evaluate(() => {
      localStorage.removeItem('e2e-test-data');
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // In a real scenario, you would make API calls to cleanup test data
    // This might include:
    // - Deleting test categories
    // - Removing test users
    // - Cleaning up test establishments
    
    console.log('✅ Test data cleanup completed');
  } catch (error) {
    console.error('❌ Test data cleanup failed:', error);
  }
}

async function generateTestSummary() {
  console.log('📊 Generating test summary...');
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    const resultsPath = path.join(process.cwd(), 'test-results', 'e2e-results.json');
    
    if (fs.existsSync(resultsPath)) {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      
      const summary = {
        totalTests: results.stats?.total || 0,
        passed: results.stats?.passed || 0,
        failed: results.stats?.failed || 0,
        skipped: results.stats?.skipped || 0,
        duration: results.stats?.duration || 0,
        timestamp: new Date().toISOString(),
        suites: results.suites?.map((suite: any) => ({
          title: suite.title,
          tests: suite.tests?.length || 0,
          passed: suite.tests?.filter((t: any) => t.outcome === 'passed').length || 0,
          failed: suite.tests?.filter((t: any) => t.outcome === 'failed').length || 0
        })) || []
      };
      
      // Write summary
      const summaryPath = path.join(process.cwd(), 'test-results', 'e2e-summary.json');
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
      
      // Log summary to console
      console.log('📈 Test Summary:');
      console.log(`   Total Tests: ${summary.totalTests}`);
      console.log(`   Passed: ${summary.passed}`);
      console.log(`   Failed: ${summary.failed}`);
      console.log(`   Skipped: ${summary.skipped}`);
      console.log(`   Duration: ${Math.round(summary.duration / 1000)}s`);
      
      if (summary.failed > 0) {
        console.log('❌ Some tests failed. Check the detailed report for more information.');
      } else {
        console.log('✅ All tests passed successfully!');
      }
    }
    
    console.log('✅ Test summary generated');
  } catch (error) {
    console.error('❌ Test summary generation failed:', error);
  }
}

export default globalTeardown;