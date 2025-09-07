# RankPilot E2E Testing Suite

This directory contains comprehensive End-to-End (E2E) tests for RankPilot's authentication and security features, implementing Phase 1 of the testing roadmap.

## 📋 Test Coverage

### Authentication Flow Tests (`auth-flow.spec.ts`)

- ✅ User registration with email/password
- ✅ User login with existing credentials
- ✅ Social authentication (Google, GitHub)
- ✅ Authentication guards and redirects
- ✅ Logout functionality
- ✅ Session management
- ✅ Navigation between auth pages
- ✅ Form validation and error handling

### Security Tests (`auth-security.spec.ts`)

- ✅ SQL injection protection
- ✅ XSS (Cross-Site Scripting) protection
- ✅ Brute force attack prevention
- ✅ Session security and hijacking protection
- ✅ Authentication bypass prevention
- ✅ Input validation and sanitization
- ✅ ReCAPTCHA integration
- ✅ Rate limiting enforcement

## 🚀 Running Tests

### Prerequisites

1. Ensure the development server is running:

   ```bash
   npm run dev-no-turbopack
   ```

2. Install Playwright browsers (one-time setup):
   ```bash
   npx playwright install
   ```

### Test Commands

#### Run All E2E Tests

```bash
npm run test:e2e:all
```

#### Run Authentication Flow Tests Only

```bash
npm run test:e2e:auth
```

#### Run Security Tests Only

```bash
npm run test:e2e:security
```

#### Run Phase 1 Tests (Auth + Security)

```bash
npm run test:e2e:phase1
```

#### Run Tests in Headed Mode (Visual)

```bash
npm run test:e2e:headed
```

#### Run Tests with UI Mode (Interactive)

```bash
npm run test:e2e:ui
```

#### Run Specific Test File

```bash
npx playwright test testing/e2e/auth-flow.spec.ts --config=playwright.config.e2e.ts
```

## 🔧 Configuration

### Test Environment Variables

Create a `.env.local` file with test credentials:

```bash
# Test User Credentials
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPassword123!
TEST_ADMIN_EMAIL=admin@example.com
TEST_ADMIN_PASSWORD=AdminPassword123!

# Test Configuration
TEST_BASE_URL=http://localhost:3000
CRAWL_PROBE_TOKEN=8ab3b3a95a0d9cf1b5bb2b61be5e3981
```

### Playwright Configuration

- **Config File**: `playwright.config.e2e.ts`
- **Base URL**: Configurable via `TEST_BASE_URL`
- **Browsers**: Chromium, Firefox, WebKit
- **Parallel Execution**: Disabled for stability
- **Timeouts**: 30s navigation, 25s actions
- **Screenshots**: On failure only
- **Videos**: Retained on failure

## 📊 Test Results

### Output Locations

- **HTML Report**: `playwright-report/index.html`
- **JSON Results**: `test-results/e2e-results.json`
- **Screenshots**: `test-results/screenshots/`
- **Videos**: `test-results/videos/`

### Viewing Results

```bash
# Open HTML report
npx playwright show-report

# View specific test results
cat test-results/e2e-results.json
```

## 🏗️ Test Architecture

### Helper Classes

#### `AuthHelper`

- `login()` - Authenticate with email/password
- `register()` - Create new user account
- `logout()` - Sign out current user
- `isAuthenticated()` - Check authentication status
- `clearAuthState()` - Reset auth state for tests

#### `SecurityHelper`

- `testSQLInjection()` - Test SQL injection protection
- `testXSS()` - Test XSS vulnerability protection
- `testRateLimiting()` - Test brute force prevention
- `testSessionSecurity()` - Test session hijacking protection

#### `PageHelper`

- `waitForPageLoad()` - Wait for complete page load
- `takeScreenshot()` - Capture test screenshots
- `isVisibleWithRetry()` - Robust element visibility checks

#### `TestDataHelper`

- `generateTestEmail()` - Create unique test emails
- `generateTestPassword()` - Create strong test passwords
- `cleanupTestData()` - Clean up test artifacts

### Test Data

- **Test Users**: Predefined user accounts for testing
- **Security Payloads**: Malicious input for security testing
- **Edge Cases**: Boundary conditions and error scenarios

## 🔒 Security Testing Methodology

### SQL Injection Testing

- Tests email and password fields with SQL injection payloads
- Verifies server-side sanitization and prepared statements
- Checks for proper error handling without data leakage

### XSS Protection Testing

- Tests input fields with XSS payloads
- Verifies client-side and server-side sanitization
- Checks for proper Content Security Policy (CSP) enforcement

### Authentication Bypass Testing

- Tests direct access to protected routes
- Verifies API endpoint protection
- Tests session token validation
- Checks for proper redirect behavior

### Rate Limiting Testing

- Tests multiple rapid authentication attempts
- Verifies rate limiting implementation
- Checks for CAPTCHA integration when needed

## 📈 Test Metrics

### Success Criteria

- **Authentication Tests**: 100% pass rate for core flows
- **Security Tests**: 0 vulnerabilities detected
- **Performance**: All tests complete within timeout limits
- **Stability**: No flaky tests in CI environment

### Coverage Goals

- **User Registration**: All form fields and validation rules
- **User Login**: All authentication methods and error states
- **Session Management**: Persistence, timeout, and security
- **Security**: All common attack vectors covered

## 🐛 Debugging Tests

### Common Issues

#### Test Timeouts

```bash
# Increase timeout for slow operations
page.setDefaultTimeout(60000);
```

#### Element Not Found

```bash
# Wait for element with retry
await page.waitForSelector('.element', { timeout: 10000 });
```

#### Authentication State Issues

```bash
# Clear auth state between tests
await context.clearCookies();
await page.evaluate(() => localStorage.clear());
```

### Debug Mode

```bash
# Run tests in debug mode
npx playwright test --debug testing/e2e/auth-flow.spec.ts
```

## 🔄 CI/CD Integration

### GitHub Actions

Tests are automatically run on:

- Pull requests to main branch
- Pushes to main branch
- Manual workflow dispatch

### Test Environments

- **Development**: Local development server
- **Staging**: Deployed staging environment
- **Production**: Live production environment (smoke tests only)

## 📚 Best Practices

### Writing New Tests

1. Use descriptive test names
2. Group related tests in `describe` blocks
3. Use helper functions for common operations
4. Include proper error handling
5. Add screenshots/videos for debugging
6. Clean up test data after execution

### Test Data Management

1. Use unique test data for each test run
2. Clean up test artifacts
3. Avoid dependencies between tests
4. Use environment-specific test data

### Security Considerations

1. Never commit real credentials
2. Use test-specific accounts
3. Implement proper cleanup
4. Follow principle of least privilege

## 📞 Support

### Getting Help

- Check test output for detailed error messages
- Review screenshots and videos in `test-results/`
- Use `--debug` flag for step-by-step execution
- Check Playwright documentation for advanced features

### Reporting Issues

- Include test output and error messages
- Attach screenshots/videos when available
- Specify browser and environment details
- Provide steps to reproduce the issue

---

## 🎯 Phase 1 Testing Roadmap Status

### ✅ Completed

- [x] API route unit tests (health, user preferences)
- [x] Component integration tests (feature gate)
- [x] E2E authentication flow tests
- [x] Security testing for authentication bypass

### 🔄 Next Steps (Phase 2)

- [ ] Service layer unit tests
- [ ] Integration tests
- [ ] Performance testing
- [ ] Accessibility testing

This E2E testing suite provides comprehensive coverage of RankPilot's authentication system, ensuring security, reliability, and user experience quality.</content>
<parameter name="filePath">/workspaces/RankPilot/testing/e2e/README.md
