/**
 * Manual Test Script for Login Flow
 * 
 * This script provides manual testing instructions for the complete login flow
 * and redirection functionality as required by task 14.
 */

export interface LoginFlowTestResults {
  validCredentialsTest: boolean;
  invalidCredentialsTest: boolean;
  tokenRefreshTest: boolean;
  logoutTest: boolean;
  noConsoleWarnings: boolean;
}

export class LoginFlowManualTester {
  private testResults: LoginFlowTestResults = {
    validCredentialsTest: false,
    invalidCredentialsTest: false,
    tokenRefreshTest: false,
    logoutTest: false,
    noConsoleWarnings: false
  };

  /**
   * Test 1: Login with valid credentials → redirection to dashboard
   * 
   * Steps:
   * 1. Navigate to /auth/login
   * 2. Enter valid credentials (username: testuser, password: password123)
   * 3. Click login button
   * 4. Verify successful login message appears
   * 5. Verify redirection to /dashboard
   * 6. Verify authentication state is set correctly
   * 7. Verify localStorage contains auth data
   */
  async testValidCredentialsLogin(): Promise<boolean> {
    console.log('🧪 Testing valid credentials login...');
    
    try {
      // Check if we're on login page
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/auth/login')) {
        console.log('❌ Not on login page. Navigate to /auth/login first.');
        return false;
      }

      // Check if form exists
      const loginForm = document.querySelector('form');
      if (!loginForm) {
        console.log('❌ Login form not found');
        return false;
      }

      // Check if username and password fields exist
      const usernameField = document.querySelector('input[formControlName="username"]') as HTMLInputElement;
      const passwordField = document.querySelector('input[formControlName="password"]') as HTMLInputElement;
      const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;

      if (!usernameField || !passwordField || !submitButton) {
        console.log('❌ Required form fields not found');
        return false;
      }

      console.log('✅ Login form elements found');
      console.log('📝 Manual steps:');
      console.log('   1. Enter "testuser" in username field');
      console.log('   2. Enter "password123" in password field');
      console.log('   3. Click submit button');
      console.log('   4. Verify success message appears');
      console.log('   5. Verify redirect to /dashboard');
      console.log('   6. Check localStorage for auth data');

      return true;
    } catch (error) {
      console.error('❌ Error in valid credentials test:', error);
      return false;
    }
  }

  /**
   * Test 2: Login with invalid credentials → display error
   * 
   * Steps:
   * 1. Navigate to /auth/login
   * 2. Enter invalid credentials (username: testuser, password: wrongpassword)
   * 3. Click login button
   * 4. Verify error message appears
   * 5. Verify no redirection occurs
   * 6. Verify authentication state remains false
   */
  async testInvalidCredentialsLogin(): Promise<boolean> {
    console.log('🧪 Testing invalid credentials login...');
    
    try {
      console.log('📝 Manual steps:');
      console.log('   1. Navigate to /auth/login');
      console.log('   2. Enter "testuser" in username field');
      console.log('   3. Enter "wrongpassword" in password field');
      console.log('   4. Click submit button');
      console.log('   5. Verify error message appears');
      console.log('   6. Verify no redirect occurs');
      console.log('   7. Verify localStorage has no auth data');

      return true;
    } catch (error) {
      console.error('❌ Error in invalid credentials test:', error);
      return false;
    }
  }

  /**
   * Test 3: Automatic token refresh
   * 
   * Steps:
   * 1. Login with valid credentials
   * 2. Modify token expiration in localStorage to be within refresh threshold
   * 3. Navigate to a protected route
   * 4. Verify automatic token refresh occurs
   * 5. Verify new token is stored in localStorage
   */
  async testTokenRefresh(): Promise<boolean> {
    console.log('🧪 Testing automatic token refresh...');
    
    try {
      console.log('📝 Manual steps:');
      console.log('   1. Login with valid credentials first');
      console.log('   2. Open browser DevTools → Application → Local Storage');
      console.log('   3. Find "auth.expiresAt" key');
      console.log('   4. Modify value to be 4 minutes from now:');
      console.log('      new Date(Date.now() + 4 * 60 * 1000).toISOString()');
      console.log('   5. Navigate to /dashboard');
      console.log('   6. Check Network tab for refresh token request');
      console.log('   7. Verify new token in localStorage');

      // Helper function to set token expiration
      const setTokenExpiration = (minutes: number) => {
        const expirationTime = new Date(Date.now() + minutes * 60 * 1000).toISOString();
        localStorage.setItem('auth.expiresAt', expirationTime);
        console.log(`🔧 Helper: Set token expiration to ${minutes} minutes from now`);
        console.log(`   localStorage.setItem('auth.expiresAt', '${expirationTime}')`);
      };

      // Expose helper function globally for manual testing
      (window as any).setTokenExpiration = setTokenExpiration;
      console.log('🔧 Helper function available: window.setTokenExpiration(minutes)');

      return true;
    } catch (error) {
      console.error('❌ Error in token refresh test:', error);
      return false;
    }
  }

  /**
   * Test 4: Logout and redirection to login
   * 
   * Steps:
   * 1. Ensure user is logged in
   * 2. Call logout function
   * 3. Verify localStorage is cleared
   * 4. Verify authentication state is false
   * 5. Verify redirect to login page when accessing protected routes
   */
  async testLogout(): Promise<boolean> {
    console.log('🧪 Testing logout functionality...');
    
    try {
      console.log('📝 Manual steps:');
      console.log('   1. Ensure you are logged in first');
      console.log('   2. Open browser DevTools → Console');
      console.log('   3. Run: authService.logout() (if available)');
      console.log('   4. Or manually clear localStorage auth keys:');
      console.log('      localStorage.removeItem("auth.token")');
      console.log('      localStorage.removeItem("auth.refreshToken")');
      console.log('      localStorage.removeItem("auth.expiresAt")');
      console.log('      localStorage.removeItem("auth.user")');
      console.log('      localStorage.removeItem("auth.roles")');
      console.log('   5. Try to navigate to /dashboard');
      console.log('   6. Verify redirect to /auth/login');

      // Helper function to clear auth data
      const clearAuthData = () => {
        localStorage.removeItem('auth.token');
        localStorage.removeItem('auth.refreshToken');
        localStorage.removeItem('auth.expiresAt');
        localStorage.removeItem('auth.user');
        localStorage.removeItem('auth.roles');
        localStorage.removeItem('selectedEstabelecimento');
        console.log('🔧 Auth data cleared from localStorage');
      };

      // Expose helper function globally for manual testing
      (window as any).clearAuthData = clearAuthData;
      console.log('🔧 Helper function available: window.clearAuthData()');

      return true;
    } catch (error) {
      console.error('❌ Error in logout test:', error);
      return false;
    }
  }

  /**
   * Test 5: Verify no console warnings
   * 
   * Steps:
   * 1. Open browser DevTools → Console
   * 2. Clear console
   * 3. Perform login flow
   * 4. Verify no warnings or errors appear
   */
  async testNoConsoleWarnings(): Promise<boolean> {
    console.log('🧪 Testing for console warnings...');
    
    try {
      console.log('📝 Manual steps:');
      console.log('   1. Open browser DevTools → Console');
      console.log('   2. Clear console (Ctrl+L or Cmd+K)');
      console.log('   3. Perform complete login flow');
      console.log('   4. Check for any warnings or errors');
      console.log('   5. Acceptable: Info logs and debug messages');
      console.log('   6. Not acceptable: Warnings, errors, or deprecation notices');

      // Set up console monitoring
      const originalWarn = console.warn;
      const originalError = console.error;
      const warnings: string[] = [];
      const errors: string[] = [];

      console.warn = (...args: any[]) => {
        warnings.push(args.join(' '));
        originalWarn.apply(console, args);
      };

      console.error = (...args: any[]) => {
        errors.push(args.join(' '));
        originalError.apply(console, args);
      };

      // Expose monitoring results
      (window as any).getConsoleIssues = () => {
        return { warnings, errors };
      };

      console.log('🔧 Console monitoring active. Check results with: window.getConsoleIssues()');

      return true;
    } catch (error) {
      console.error('❌ Error in console warnings test:', error);
      return false;
    }
  }

  /**
   * Run all manual tests
   */
  async runAllTests(): Promise<LoginFlowTestResults> {
    console.log('🚀 Starting Login Flow Manual Tests');
    console.log('=====================================');

    this.testResults.validCredentialsTest = await this.testValidCredentialsLogin();
    console.log('');

    this.testResults.invalidCredentialsTest = await this.testInvalidCredentialsLogin();
    console.log('');

    this.testResults.tokenRefreshTest = await this.testTokenRefresh();
    console.log('');

    this.testResults.logoutTest = await this.testLogout();
    console.log('');

    this.testResults.noConsoleWarnings = await this.testNoConsoleWarnings();
    console.log('');

    console.log('📊 Test Results Summary:');
    console.log('========================');
    Object.entries(this.testResults).forEach(([test, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'READY' : 'NEEDS ATTENTION'}`);
    });

    return this.testResults;
  }

  /**
   * Check current authentication state
   */
  checkAuthState(): void {
    console.log('🔍 Current Authentication State:');
    console.log('================================');
    
    const token = localStorage.getItem('auth.token');
    const refreshToken = localStorage.getItem('auth.refreshToken');
    const expiresAt = localStorage.getItem('auth.expiresAt');
    const user = localStorage.getItem('auth.user');
    const roles = localStorage.getItem('auth.roles');

    console.log('Token:', token ? '✅ Present' : '❌ Missing');
    console.log('Refresh Token:', refreshToken ? '✅ Present' : '❌ Missing');
    console.log('Expires At:', expiresAt || '❌ Missing');
    console.log('User:', user ? '✅ Present' : '❌ Missing');
    console.log('Roles:', roles || '❌ Missing');

    if (expiresAt) {
      const expiration = new Date(expiresAt);
      const now = new Date();
      const timeRemaining = expiration.getTime() - now.getTime();
      const minutesRemaining = Math.floor(timeRemaining / (1000 * 60));
      
      console.log(`Time until expiration: ${minutesRemaining} minutes`);
      console.log(`Should refresh: ${minutesRemaining <= 5 ? '✅ Yes' : '❌ No'}`);
    }

    console.log('Current URL:', window.location.href);
  }
}

// Make the tester available globally for manual testing
(window as any).LoginFlowTester = LoginFlowManualTester;

// Auto-run when script is loaded
if (typeof window !== 'undefined') {
  console.log('🔧 Login Flow Manual Tester loaded!');
  console.log('Usage: const tester = new LoginFlowTester(); tester.runAllTests();');
  console.log('Or: tester.checkAuthState();');
}