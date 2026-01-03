# VoidLink QA - Automated Testing

Automated end-to-end tests for VoidLink using Playwright.

## Setup

1. **Install dependencies:**

   ```bash
   cd webapp/Client
   npm install -D @playwright/test
   npx playwright install chromium
   ```

2. **Ensure backend is running:**

   ```bash
   cd webapp
   docker compose up
   ```

3. **Ensure frontend dev server is running:**
   ```bash
   cd webapp/Client
   npm run dev
   ```

## Running Tests

### Run all tests:

```bash
cd webapp/Client/QA
npx playwright test
```

### Run specific test file:

```bash
npx playwright test tests/01-registration.spec.ts
npx playwright test tests/02-login.spec.ts
npx playwright test tests/03-contacts.spec.ts
npx playwright test tests/04-messaging.spec.ts
```

### Run tests in UI mode (interactive):

```bash
npx playwright test --ui
```

### Run tests in headed mode (see browser):

```bash
npx playwright test --headed
```

### Debug a specific test:

```bash
npx playwright test tests/04-messaging.spec.ts --debug
```

### View test report:

```bash
npx playwright show-report
```

## Test Structure

### 01-registration.spec.ts

- ✅ Register new user successfully
- ✅ Reject duplicate username
- ✅ Validate password strength

### 02-login.spec.ts

- ✅ Login with correct credentials
- ✅ Reject wrong password
- ✅ Reject wrong passphrase
- ✅ Test session persistence after refresh

### 03-contacts.spec.ts

- ✅ Register two users
- ✅ Send contact request
- ✅ Accept contact request
- ✅ Verify mutual contacts

### 04-messaging.spec.ts

- ✅ Send and receive messages in real-time
- ✅ Verify message encryption/decryption
- ✅ Test message persistence after logout/login

## Test Data

Tests use timestamped usernames to avoid conflicts:

- `testuser_{timestamp}`
- `alice_{timestamp}`
- `bob_{timestamp}`

## Configuration

See `playwright.config.ts` for:

- Base URL configuration
- Browser settings
- Screenshot/video capture
- Test timeout settings

## Debugging

### Check browser console:

```bash
npx playwright test --headed
# Open DevTools in the browser window
```

### Take screenshots on failure:

Screenshots are automatically saved to `test-results/` on failure.

### Record video:

Videos are saved to `test-results/` for failed tests.

### Trace viewer:

```bash
npx playwright show-trace test-results/.../trace.zip
```

## CI/CD Integration

Add to your CI pipeline:

```yaml
- name: Install Playwright
  run: |
    cd webapp/Client
    npm install -D @playwright/test
    npx playwright install --with-deps chromium

- name: Run E2E tests
  run: |
    cd webapp/Client/QA
    npx playwright test
```

## Known Issues to Test

1. **Session expiration on refresh** - Test 02 will identify this
2. **Messages not persisting** - Test 04 will identify this
3. **WebSocket connection** - Test 04 will verify real-time messaging

## Expected Results

All tests should pass with:

- ✅ No console errors
- ✅ Messages sent and received
- ✅ Messages persist after logout/login
- ✅ Session handling works correctly

## Troubleshooting

### Tests fail with "Target closed"

- Increase timeout in playwright.config.ts
- Check if backend is running
- Check if frontend dev server is running

### Tests fail with "Locator not found"

- Check if UI elements have changed
- Update selectors in test files
- Use `--headed` mode to see what's happening

### WebSocket connection fails

- Check backend WebSocket server is running
- Check browser console for WebSocket errors
- Verify tokens are being sent correctly

## Adding New Tests

1. Create new file in `tests/` directory
2. Follow naming convention: `##-feature.spec.ts`
3. Use descriptive test names
4. Add assertions for expected behavior
5. Clean up test data if needed

Example:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Feature Name", () => {
  test("should do something", async ({ page }) => {
    await page.goto("/");
    // Test steps
    await expect(page.locator("selector")).toBeVisible();
  });
});
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Selectors](https://playwright.dev/docs/selectors)
- [Playwright Assertions](https://playwright.dev/docs/test-assertions)

---

**Happy Testing!** 🧪
