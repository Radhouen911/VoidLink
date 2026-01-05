# VoidLink E2E Testing

Complete end-to-end test suite for VoidLink secure messaging application.

## 🚀 Quick Start

### 1. Start Servers

**Terminal 1 - Backend:**

```bash
cd webapp/Server
npm start
```

Wait for: `Server running on port 3000`

**Terminal 2 - Frontend:**

```bash
cd webapp/Client
npm run dev
```

Wait for: `Local: http://localhost:5173/`

### 2. Run Tests

**Terminal 3 - Tests:**

```bash
cd webapp/Client/QA
test.bat
```

Choose option:

- **[1] Quick Test** - Main E2E test only (~2 min)
- **[2] Full Suite** - All tests with report (~20 min)
- **[3] View Report** - Open last HTML report

---

## 📋 Test Suites

| Suite                 | File                        | Tests | Duration | Description                                  |
| --------------------- | --------------------------- | ----- | -------- | -------------------------------------------- |
| **E2E Complete**      | `e2e-complete.spec.ts`      | 1     | ~90s     | Full user flow: register → contact → message |
| **Crypto Operations** | `crypto-operations.spec.ts` | 4     | ~6m      | Encryption, special chars, long messages     |
| **Security**          | `security.spec.ts`          | 8     | ~5m      | XSS, SQL injection, auth security            |
| **Error Handling**    | `error-handling.spec.ts`    | 10    | ~6m      | Invalid inputs, network errors               |
| **UI/UX**             | `ui-ux.spec.ts`             | 3     | ~2m      | Interface, accessibility, loading states     |

**Total:** 26 tests, ~20 minutes

---

## 🎯 Running Tests

### Simple Commands

```bash
# Interactive menu
test.bat

# Quick E2E test
run-quick-test.bat

# Full test suite
run-all-tests.bat
```

### Using npm

```bash
cd webapp/Client

# Quick test
npm run test:quick

# All tests
npm run test:all

# Specific suites
npm run test:crypto
npm run test:security
npm run test:errors

# View report
npm run test:report
```

### Advanced Options

```bash
# Watch tests run in browser
npx playwright test --headed

# Debug mode (step through)
npx playwright test --debug

# Interactive UI mode
npm run test:ui

# Specific test file
npx playwright test e2e-complete.spec.ts
```

---

## 📊 Test Reports

### HTML Report (Recommended)

After running tests:

```bash
npx playwright show-report
```

Features:

- ✅ Pass/fail status for each test
- ✅ Screenshots on failure
- ✅ Videos on failure
- ✅ Execution timeline
- ✅ Error details with stack traces

### JSON Report

Located at: `test-results/results.json`

Perfect for CI/CD integration.

---

## ✅ What Tests Cover

### E2E Complete Flow

1. Register two users (Alice & Bob)
2. Alice sends contact request to Bob
3. Bob accepts request
4. Verify real-time contact sync
5. Alice sends message to Bob
6. Bob receives and decrypts message
7. Bob replies to Alice
8. Test typing indicators
9. Send multiple messages
10. Verify all encryption/decryption

### Crypto Operations

- Special characters (emoji, unicode, HTML)
- Very long messages (5KB, 10KB)
- Rapid message sending (20 messages in quick succession)
- Empty and whitespace-only messages

### Security Tests

- XSS attack prevention (script injection)
- SQL injection prevention
- Password strength validation
- Session expiration handling
- Unauthorized access prevention
- Logout and data clearing
- Passphrase validation

### Error Handling

- Invalid username formats
- Password/passphrase mismatch
- Incorrect login credentials
- Non-existent users
- Duplicate contact requests
- Network disconnection
- Self-contact requests

### UI/UX

- Responsive navigation
- Loading states
- Accessible form labels
- Button visibility

---

## 🐛 Troubleshooting

### Tests Fail Immediately

**Problem:** Servers not running

**Solution:**

```bash
# Check backend
curl http://localhost:3000/health

# Check frontend
curl http://localhost:5173

# Start if needed
cd webapp/Server && npm start
cd webapp/Client && npm run dev
```

---

### Tests Timeout

**Problem:** Slow system or network

**Solution:** Edit `playwright.config.ts`:

```typescript
timeout: 90000, // Increase to 90 seconds
```

---

### Contact Request Not Appearing

**Reason:** Real-time WebSocket delay (normal behavior)

**Solution:** Tests include automatic retry logic. No action needed.

---

### Messages Not Decrypting

**Check:**

1. Browser console for errors (tests show this)
2. Backend logs for encryption issues
3. Correct passphrase used

---

## 📁 File Structure

```
QA/
├── tests/
│   ├── e2e-complete.spec.ts      # Main E2E test ⭐
│   ├── crypto-operations.spec.ts # Encryption tests
│   ├── security.spec.ts          # Security tests
│   ├── error-handling.spec.ts    # Error scenarios
│   ├── ui-ux.spec.ts             # UI/UX tests
│   ├── working-e2e.spec.ts       # Alternative E2E
│   └── voidlink-e2e.spec.ts      # Alternative E2E
├── playwright.config.ts          # Test configuration
├── test.bat                      # Interactive runner ⭐
├── run-quick-test.bat           # Quick test runner
├── run-all-tests.bat            # Full suite runner
├── TEST-GUIDE.md                # Detailed guide
├── QUICK-START.md               # Quick reference
└── README-TESTING.md            # This file
```

---

## ⚙️ Configuration

### `playwright.config.ts`

```typescript
{
  testDir: "./tests",
  workers: 1,              // Sequential (not parallel)
  retries: 0,              // No automatic retries
  timeout: 60000,          // 60 seconds per test
  reporter: ["html", "json", "list"],
  baseURL: "http://localhost:5173",

  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  }
}
```

### Customize for Your Needs

**Parallel execution:**

```typescript
workers: 4; // Run 4 tests simultaneously
```

**Retry flaky tests:**

```typescript
retries: 2; // Retry failed tests twice
```

**Longer timeout:**

```typescript
timeout: 120000; // 2 minutes per test
```

---

## 🔄 CI/CD Integration

### GitHub Actions

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: |
          cd webapp/Client
          npm install

      - name: Start servers
        run: |
          cd webapp/Server && npm start &
          cd webapp/Client && npm run dev &
          sleep 10

      - name: Run tests
        run: |
          cd webapp/Client/QA
          npx playwright test --reporter=json,html

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: webapp/Client/QA/playwright-report/
```

---

## 📈 Performance Benchmarks

| Metric      | Value                                                     |
| ----------- | --------------------------------------------------------- |
| Quick Test  | ~90 seconds                                               |
| Full Suite  | ~20 minutes                                               |
| Total Tests | 26                                                        |
| Test Files  | 5 active                                                  |
| Coverage    | Registration, Auth, Contacts, Messaging, Crypto, Security |

---

## 🎓 Best Practices

### ✅ DO

- Always start backend and frontend before tests
- Use `test.bat` for interactive testing
- Check HTML report after failures
- Run full suite before production deployment
- Keep test data unique (uses timestamps)

### ❌ DON'T

- Run tests without servers
- Modify test data during execution
- Run multiple test instances simultaneously
- Ignore test failures
- Commit test artifacts (screenshots, videos)

---

## 🔧 Maintenance

### Adding New Tests

1. Create file in `tests/` directory:

```typescript
// tests/new-feature.spec.ts
import { expect, test } from "@playwright/test";

test.describe("New Feature", () => {
  test("should work correctly", async ({ page }) => {
    // Your test code
  });
});
```

2. Run it:

```bash
npx playwright test new-feature.spec.ts
```

### Updating Selectors

If UI changes, update selectors:

```typescript
// Old
page.locator('button:has-text("Add Contact")');

// New
page.locator('button:has-text("New Contact")');
```

---

## 📚 Documentation

- **TEST-GUIDE.md** - Comprehensive testing guide
- **QUICK-START.md** - Quick reference for running tests
- **README-TESTING.md** - This file (overview)

---

## 🆘 Support

### View Detailed Logs

```bash
npx playwright test --reporter=list
```

### Debug Specific Test

```bash
npx playwright test e2e-complete.spec.ts --debug
```

### Generate Trace

```bash
npx playwright test --trace on
npx playwright show-trace trace.zip
```

---

## ✨ Success Criteria

Tests pass when:

- ✅ Both users register successfully
- ✅ Contact requests send and receive
- ✅ Messages encrypt/decrypt correctly
- ✅ Real-time updates work via WebSocket
- ✅ No console errors
- ✅ No timeout errors
- ✅ Security vulnerabilities blocked
- ✅ Errors handled gracefully

---

## 📝 Notes

- Tests use unique usernames (timestamp-based) to avoid conflicts
- Tests run sequentially (not parallel) to avoid race conditions
- Real-time features may have slight delays (tests account for this)
- Screenshots and videos only saved on failure
- HTML report provides best debugging experience

---

**Version:** 1.0.0  
**Last Updated:** January 2026  
**Playwright:** 1.57.0  
**Node:** 18+

---

## Quick Commands Reference

```bash
# Start servers
cd webapp/Server && npm start
cd webapp/Client && npm run dev

# Run tests
cd webapp/Client/QA && test.bat

# View report
npx playwright show-report

# Debug
npx playwright test --debug
```

---

**Need help?** Check TEST-GUIDE.md for detailed documentation.
