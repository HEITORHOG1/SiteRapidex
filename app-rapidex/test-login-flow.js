const { execSync } = require('child_process');

try {
  console.log('Running login flow integration tests...');
  
  // Run only the login flow tests
  const result = execSync('npx karma start --single-run --browsers=ChromeHeadless --include="**/login-flow.integration.spec.ts"', {
    cwd: process.cwd(),
    stdio: 'inherit'
  });
  
  console.log('Login flow tests completed successfully!');
} catch (error) {
  console.error('Login flow tests failed:', error.message);
  process.exit(1);
}