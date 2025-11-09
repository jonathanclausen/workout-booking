# Testing Guide

This guide covers how to set up and run integration tests for the Arca Booking App.

## Overview

We have three types of tests:

1. **Backend Integration Tests** - Test API endpoints with Firebase
2. **Arca Client Tests** - Test external API integration
3. **E2E Tests** - Test complete user flows with Playwright

## Setup

### 1. Install Test Dependencies

```bash
# Backend tests
cd backend
npm install --save-dev jest supertest

# E2E tests (from project root)
npm install --save-dev @playwright/test
npx playwright install
```

### 2. Set Up Firebase Emulators (Optional but Recommended)

```bash
npm install -g firebase-tools
firebase login
firebase init emulators
```

Select:
- Firestore Emulator
- Authentication Emulator

Update `firebase.json`:
```json
{
  "emulators": {
    "firestore": {
      "port": 8081
    },
    "auth": {
      "port": 9099
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

### 3. Environment Variables for Testing

Create `.env.test`:
```bash
NODE_ENV=test
FIRESTORE_EMULATOR_HOST=localhost:8081
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
SESSION_SECRET=test-secret-key

# Optional: Real Arca credentials for integration tests
ARCA_TEST_USERNAME=your-test-account@example.com
ARCA_TEST_PASSWORD=your-test-password
```

## Running Tests

### Backend Integration Tests

```bash
cd backend

# Run all tests
npm test

# Run specific test file
npm test tests/api.test.js

# Run with coverage
npm run test:coverage

# Watch mode (re-run on file changes)
npm run test:watch
```

### E2E Tests with Playwright

```bash
# From project root

# Run all E2E tests
npx playwright test

# Run in headed mode (see browser)
npx playwright test --headed

# Run specific browser
npx playwright test --project=chromium

# Run specific test file
npx playwright test e2e/booking-flow.spec.js

# Open interactive UI
npx playwright test --ui

# Generate test report
npx playwright show-report
```

### Manual Testing with Firebase Emulators

```bash
# Terminal 1: Start emulators
firebase emulators:start

# Terminal 2: Start backend (will connect to emulators)
cd backend
npm run dev

# Terminal 3: Start frontend
cd frontend
npm start

# Open http://localhost:4000 for Emulator UI
```

## Test Structure

### Backend Tests

```
backend/
  tests/
    api.test.js          # API endpoint tests
    arca-client.test.js  # Arca API integration tests
    cron.test.js         # Cron job logic tests
```

**Example test:**
```javascript
describe('POST /api/booking-rules', () => {
  it('should create a new booking rule', async () => {
    const newRule = {
      className: 'WOD',
      dayOfWeek: 'monday',
      time: '18:00',
      maxWaitingList: 2
    };

    const response = await request(app)
      .post('/api/booking-rules')
      .send(newRule)
      .expect(200);

    expect(response.body).toHaveProperty('id');
    expect(response.body.maxWaitingList).toBe(2);
  });
});
```

### E2E Tests

```
e2e/
  booking-flow.spec.js   # Complete user flow tests
```

**Example test:**
```javascript
test('should create booking rule', async ({ page }) => {
  await page.goto('http://localhost:4200/dashboard');
  await page.click('button:has-text("+ Add Rule")');
  await page.fill('#maxWaitingList', '2');
  await page.click('button:has-text("Create Rule")');
  await expect(page.locator('.rule-item')).toBeVisible();
});
```

## Testing Strategy

### What to Test

#### Backend Integration Tests ✅
- ✅ API endpoint authentication
- ✅ CRUD operations for booking rules
- ✅ Arca credentials encryption/decryption
- ✅ Booking logic (matching, waiting list)
- ✅ Cron job execution
- ✅ Error handling

#### E2E Tests ✅
- ✅ Login flow
- ✅ Saving Arca credentials
- ✅ Viewing current bookings
- ✅ Creating booking rules
- ✅ Editing booking rules
- ✅ Deleting booking rules
- ✅ Mobile responsiveness
- ✅ Error messages

### What NOT to Test
- ❌ Google OAuth flow (too complex, test manually)
- ❌ Real Arca booking (use test account only)
- ❌ Firebase Admin SDK internals
- ❌ Third-party library internals

## Mocking External APIs

### Mock Arca API (for faster tests)

Create `backend/tests/__mocks__/arca-client.js`:
```javascript
class MockArcaClient {
  async login() {
    return true;
  }

  async getGyms() {
    return [
      { id: 1, name: 'Kirken' },
      { id: 2, name: 'Boxen' }
    ];
  }

  async getClasses() {
    return [
      {
        id: 123,
        name: 'WOD',
        start_date_time: '2024-11-11T18:00:00+01:00',
        gym: { name: 'Kirken' },
        free_space: 5
      }
    ];
  }

  async bookClass() {
    return { success: true };
  }
}

module.exports = MockArcaClient;
```

Use in tests:
```javascript
jest.mock('../services/arca-client');
```

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/test.yml`:
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd backend && npm install
          cd ../frontend && npm install
          npm install -g @playwright/test
      
      - name: Run backend tests
        run: cd backend && npm test
        env:
          NODE_ENV: test
      
      - name: Run E2E tests
        run: npx playwright test
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Continuous Testing During Development

### Watch mode for quick feedback:
```bash
# Backend tests (auto-rerun on changes)
cd backend
npm run test:watch

# E2E tests in UI mode
npx playwright test --ui
```

### Pre-commit hook:
```bash
# Install husky
npm install --save-dev husky

# Create pre-commit hook
npx husky add .husky/pre-commit "cd backend && npm test"
```

## Troubleshooting

### Tests timing out
- Increase Jest timeout: `jest.setTimeout(30000)`
- Check Firebase emulators are running
- Verify backend/frontend are accessible

### Authentication errors
- Ensure mock session is set up correctly
- Check `isAuthenticated` middleware accepts test sessions

### Arca API tests failing
- Use a test account, not your real account
- Set `ARCA_TEST_USERNAME` and `ARCA_TEST_PASSWORD`
- Add retry logic for flaky external API calls

### Emulator connection issues
```bash
# Clear emulator data
firebase emulators:start --clear-on-start

# Check emulator ports
netstat -an | grep 8081
netstat -an | grep 9099
```

## Test Coverage Goals

- Backend routes: **80%+**
- Arca client: **70%+** (external API, harder to test)
- Cron logic: **90%+** (critical functionality)

Check coverage:
```bash
cd backend
npm run test:coverage
open coverage/lcov-report/index.html
```

## Best Practices

1. **Isolate tests** - Each test should be independent
2. **Clean up** - Always delete test data in `afterEach` or `afterAll`
3. **Use factories** - Create reusable test data generators
4. **Mock external APIs** - Don't hit real Arca API in every test
5. **Test edge cases** - Empty lists, invalid input, network errors
6. **Keep tests fast** - Use emulators, mock heavy operations
7. **Descriptive names** - Test names should explain what's being tested
8. **Don't test implementation** - Test behavior, not internal details

## Next Steps

- [ ] Add more edge case tests
- [ ] Set up GitHub Actions CI
- [ ] Add visual regression testing with Playwright
- [ ] Create load tests for cron job
- [ ] Add security tests (SQL injection, XSS, CSRF)
