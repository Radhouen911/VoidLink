# VoidLink E2E Testing Guide

## Prerequisites

### 1. Backend Server Running

```bash
cd webapp/Server
npm install
npm start
```

Backend should be running on `http://localhost:3000`

### 2. Frontend Dev Server Running

```bash
cd webapp/Client
npm install
npm run dev
```

Frontend should be running on `http://localhost:5173`

### 3. Clean Database State

For best results, use a clean database or ensure no conflicting test users exist.

## Running Tests

### Option 1: Run All Tests (Headless)

```bash
cd webapp/Client/QA
npx playwright test
```

### Option 2: Run Tests with UI (Recommended for debugging)

```bash
cd webapp/Client/QA
npx playwright test --headed
```

### Option 3: Run Specific Test

```bash
cd webapp/Client/QA
npx playwright test e2e-complete.spec.ts --headed
```

### Option 4: Debug Mode

```bash
cd webapp/Client/QA
npx playwright test --debug
```

## Test Coverage

The `e2e-complete.spec.ts` test covers:

1. ✅ User Registration (Alice and Bob)
2. ✅ Contact Request Flow (Alice → Bob)
3. ✅ Contact Acceptance (Bob accepts)
4. ✅ Real-time Contact Sync
5. ✅ Message Sending (Alice → Bob)
6. ✅ Message Receiving (Bob receives)
7. ✅ Message Decryption Verification
8. ✅ Reply Messages (Bob → Alice)
9. ✅ Typing Indicators
10. ✅ Multiple Messages

## Expected Results

### Success Output

```
========================================
STARTING COMPLETE E2E TEST
========================================

STEP 1: Registering users
  → Registering alice_1234567890...
  ✓ alice_1234567890 registered successfully
  → Registering bob_1234567890...
  ✓ bob_1234567890 registered successfully
✅ Step 1 Complete

STEP 2: Sending contact request
  → Sending contact request to bob_1234567890...
  ✓ Contact request sent
✅ Step 2 Complete

... (continues for all steps)

========================================
✅ ALL TESTS PASSED!
========================================
```

### Test Duration

- Expected: 60-90 seconds
- Timeout: 120 seconds

## Troubleshooting

### Issue: "Cannot navigate to invalid URL"

**Solution**: Make sure `baseURL` is set in `playwright.config.ts`:

```typescript
use: {
  baseURL: "http://localhost:5173",
}
```

### Issue: "ERR_CONNECTION_REFUSED"

**Solution**: Ensure frontend dev server is running:

```bash
cd webapp/Client
npm run dev
```

### Issue: "Contact request not visible"

**Possible Causes**:

1. Backend not running
2. WebSocket connection failed
3. Real-time notification delay

**Solution**: Test includes automatic retry with page refresh

### Issue: "Message not received"

**Possible Causes**:

1. WebSocket disconnected
2. Encryption/decryption failure
3. Contact not properly synced

**Solution**: Check browser console for errors

## Viewing Test Results

After running tests, view the HTML report:

```bash
cd webapp/Client/QA
npx playwright show-report
```

## Test Artifacts

- **Screenshots**: Captured on failure
- **Videos**: Recorded on failure
- **Traces**: Available for debugging
- **Location**: `webapp/Client/QA/test-results/`

## Manual Verification Checklist

After automated tests pass, manually verify:

- [ ] Messages show correct delivery status (🕒 → ✓ → ✓✓)
- [ ] Typing indicators appear and disappear correctly
- [ ] UI is responsive and smooth
- [ ] No console errors
- [ ] WebSocket stays connected (green indicator)
- [ ] Can use app continuously for 30+ minutes

## Notes

- Tests use unique usernames with timestamps to avoid conflicts
- Each test run creates new users (alice_TIMESTAMP, bob_TIMESTAMP)
- Tests are designed to be idempotent and can run multiple times
- Real-time features may have 1-3 second delays (normal)
