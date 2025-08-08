# Category Management E2E Tests

This directory contains comprehensive End-to-End (E2E) tests for the Category Management system using Playwright.

## Overview

The E2E test suite covers all aspects of category management functionality including:

- **CRUD Operations**: Complete Create, Read, Update, Delete workflows
- **Establishment Isolation**: Security and data isolation between establishments
- **Accessibility**: Keyboard navigation, screen reader support, ARIA compliance
- **Error Handling**: Network errors, validation errors, recovery flows
- **Performance**: Load times, memory usage, optimization verification
- **Cross-Browser**: Compatibility across Chrome, Firefox, Safari
- **Responsive Design**: Mobile, tablet, and desktop viewports

## Test Files

### Core Test Suites

- **`category-crud-workflow.e2e.spec.ts`**: Complete CRUD operation workflows
- **`category-establishment-isolation.e2e.spec.ts`**: Multi-tenant security testing
- **`category-accessibility-keyboard.e2e.spec.ts`**: Accessibility and keyboard navigation
- **`category-error-recovery.e2e.spec.ts`**: Error handling and recovery scenarios
- **`category-performance-load.e2e.spec.ts`**: Performance and load testing
- **`category-cross-browser.e2e.spec.ts`**: Cross-browser compatibility testing
- **`category-e2e-test-suite.spec.ts`**: Comprehensive integration test suite

### Configuration and Utilities

- **`playwright.config.ts`**: Playwright configuration for all browsers and devices
- **`global-setup.ts`**: Test environment setup and data preparation
- **`global-teardown.ts`**: Cleanup and test result reporting
- **`test-utils.ts`**: Utility functions and helper classes

## Requirements Coverage

The E2E tests cover all requirements from the Category Management specification:

### Requirement 1: Category Creation
- ✅ Form validation and submission
- ✅ Success feedback and navigation
- ✅ Error handling for invalid data

### Requirement 2: Category Listing
- ✅ Category display and pagination
- ✅ Empty state handling
- ✅ Loading states and error recovery

### Requirement 3: Category Details
- ✅ Detail view navigation
- ✅ Data integrity verification
- ✅ Access control validation

### Requirement 4: Category Editing
- ✅ Form pre-population
- ✅ Update workflows
- ✅ Optimistic updates

### Requirement 5: Category Deletion
- ✅ Confirmation workflows
- ✅ Dependency checking
- ✅ Bulk operations

### Requirement 6: Establishment Isolation
- ✅ Multi-tenant security
- ✅ Data isolation verification
- ✅ Access control enforcement

### Requirement 7: Responsive UI
- ✅ Mobile, tablet, desktop layouts
- ✅ Touch interactions
- ✅ Accessibility compliance

### Requirement 8: Data Validation
- ✅ Client-side validation
- ✅ Server-side validation
- ✅ XSS prevention

### Requirement 9: Performance
- ✅ Load time optimization
- ✅ Memory usage monitoring
- ✅ Caching verification

### Requirement 10: Integration
- ✅ Establishment switching
- ✅ Notification system
- ✅ State management

## Running Tests

### Prerequisites

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install
```

3. Start the application:
```bash
npm run start
```

### Test Commands

#### Run All E2E Tests
```bash
npm run test:e2e
```

#### Run Tests with UI Mode
```bash
npm run test:e2e:ui
```

#### Run Tests in Headed Mode (Visible Browser)
```bash
npm run test:e2e:headed
```

#### Debug Tests
```bash
npm run test:e2e:debug
```

#### Run Specific Browser Tests
```bash
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit
```

#### Run Mobile Tests
```bash
npm run test:e2e:mobile
```

#### View Test Reports
```bash
npm run test:e2e:report
```

#### Run All Tests (Unit + E2E)
```bash
npm run test:all
```

### Running Individual Test Files

```bash
# Run specific test file
npx playwright test category-crud-workflow.e2e.spec.ts

# Run specific test with pattern
npx playwright test --grep "should complete full CRUD cycle"

# Run tests for specific browser
npx playwright test --project=chromium category-accessibility-keyboard.e2e.spec.ts
```

## Test Data and Setup

### Test Users

The tests use the following test accounts:

- `proprietario@test.com` - Default test user with single establishment
- `proprietario1@test.com` - User for establishment isolation tests
- `proprietario2@test.com` - User for establishment isolation tests
- `multi.establishment@test.com` - User with multiple establishments

### Test Data

Test data is automatically set up during global setup and includes:

- Test establishments with different owners
- Sample categories for each establishment
- User accounts with appropriate permissions

### Environment Setup

The global setup process:

1. Verifies application is running
2. Creates test data via API or localStorage
3. Prepares test environment
4. Validates system readiness

## Test Structure

### Test Organization

Tests are organized by functionality:

```
e2e/
├── category-crud-workflow.e2e.spec.ts      # Core CRUD operations
├── category-establishment-isolation.e2e.spec.ts  # Security & isolation
├── category-accessibility-keyboard.e2e.spec.ts   # Accessibility
├── category-error-recovery.e2e.spec.ts           # Error handling
├── category-performance-load.e2e.spec.ts         # Performance
├── category-cross-browser.e2e.spec.ts            # Browser compatibility
└── category-e2e-test-suite.spec.ts              # Integration tests
```

### Test Patterns

#### Page Object Pattern
Tests use utility classes for common operations:

```typescript
const utils = new CategoryTestUtils(page);
await utils.setupTest();
await utils.createCategory('Test Category', 'Description');
```

#### Data-Driven Testing
Tests use generated test data:

```typescript
const testData = utils.generateTestData('Performance Test', 10);
for (const data of testData) {
  await utils.createCategory(data.name, data.description);
}
```

#### Error Simulation
Tests simulate various error conditions:

```typescript
await utils.mockApiError('/api/categorias/**', 500);
await utils.simulateOffline();
await utils.simulateSlowNetwork(2000);
```

## Browser and Device Coverage

### Desktop Browsers
- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari/WebKit
- ✅ Microsoft Edge

### Mobile Devices
- ✅ Mobile Chrome (Pixel 5)
- ✅ Mobile Safari (iPhone 12)

### Viewports
- ✅ Desktop (1920x1080)
- ✅ Tablet (768x1024)
- ✅ Mobile (375x667)

## Accessibility Testing

### WCAG Compliance
- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ ARIA attributes
- ✅ Color contrast
- ✅ Focus management

### Assistive Technology
- ✅ Tab navigation
- ✅ Screen reader announcements
- ✅ High contrast mode
- ✅ Reduced motion support

## Performance Testing

### Metrics Monitored
- ✅ Page load times
- ✅ Interaction response times
- ✅ Memory usage
- ✅ Bundle size optimization
- ✅ Network request efficiency

### Performance Budgets
- Page load: < 3 seconds
- Interaction response: < 1 second
- Memory increase: < 50MB
- Bundle size: Optimized chunks

## Error Scenarios

### Network Conditions
- ✅ Offline functionality
- ✅ Slow network simulation
- ✅ Request timeouts
- ✅ Connection recovery

### Server Errors
- ✅ 500 Internal Server Error
- ✅ 403 Forbidden
- ✅ 404 Not Found
- ✅ 409 Conflict (concurrent edits)
- ✅ 401 Unauthorized (session expiry)

### Validation Errors
- ✅ Client-side validation
- ✅ Server-side validation
- ✅ Duplicate name handling
- ✅ XSS prevention

## Reporting and Analysis

### Test Reports
- HTML report with screenshots and videos
- JSON report for CI/CD integration
- JUnit XML for test result parsing
- Custom summary reports

### Artifacts
- Screenshots on failure
- Video recordings of failed tests
- Performance metrics
- Console error logs

### CI/CD Integration
Tests are configured for continuous integration with:
- Parallel execution
- Retry on failure
- Artifact collection
- Result reporting

## Troubleshooting

### Common Issues

#### Tests Failing Due to Timing
```bash
# Increase timeouts in playwright.config.ts
timeout: 60000,
expect: { timeout: 10000 }
```

#### Application Not Starting
```bash
# Verify application is running
curl http://localhost:4200
# Check webServer configuration in playwright.config.ts
```

#### Browser Installation Issues
```bash
# Reinstall browsers
npx playwright install --force
```

#### Test Data Issues
```bash
# Clear test data
rm -rf test-results/
# Run with fresh setup
npm run test:e2e
```

### Debug Mode

For debugging failing tests:

```bash
# Run in debug mode
npm run test:e2e:debug

# Run specific test in debug mode
npx playwright test --debug category-crud-workflow.e2e.spec.ts
```

### Verbose Logging

Enable verbose logging:

```bash
# Set environment variable
DEBUG=pw:api npm run test:e2e
```

## Contributing

### Adding New Tests

1. Create test file following naming convention: `category-[feature].e2e.spec.ts`
2. Use existing utility functions from `test-utils.ts`
3. Follow established test patterns
4. Add appropriate data-cy attributes to components
5. Update this README with new test coverage

### Test Guidelines

- Use descriptive test names
- Group related tests in describe blocks
- Use proper setup and teardown
- Mock external dependencies
- Verify both positive and negative scenarios
- Include accessibility checks
- Add performance assertions where relevant

### Code Review Checklist

- [ ] Tests cover all user workflows
- [ ] Error scenarios are tested
- [ ] Accessibility is verified
- [ ] Performance is measured
- [ ] Cross-browser compatibility is ensured
- [ ] Test data is properly managed
- [ ] Documentation is updated

## Maintenance

### Regular Tasks

- Update browser versions
- Review and update test data
- Monitor test execution times
- Update performance budgets
- Review accessibility standards
- Update documentation

### Monitoring

- Test execution success rates
- Performance regression detection
- Browser compatibility issues
- Accessibility compliance
- Error pattern analysis

This comprehensive E2E test suite ensures the Category Management system works correctly across all supported browsers, devices, and user scenarios while maintaining high performance and accessibility standards.