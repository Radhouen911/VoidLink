import { expect, test } from "@playwright/test";

/**
 * Test: Verify No Excessive Polling
 *
 * This test ensures the app uses WebSocket for real-time updates
 * and doesn't poll excessively for messages or contacts.
 */

test.describe("No Excessive Polling", () => {
  test("should not poll API endpoints excessively", async ({ page }) => {
    const timestamp = Date.now();
    const user = {
      username: `testuser_${timestamp}`,
      password: "TestPass123!",
      passphrase: "test-secure-passphrase-123",
    };

    // Track API requests
    const apiRequests: { url: string; timestamp: number }[] = [];

    page.on("request", (request) => {
      const url = request.url();
      if (
        url.includes("/api/messages/conversation/") ||
        (url.includes("/api/contacts") && !url.includes("/request")) ||
        url.includes("/api/messages/inbox")
      ) {
        apiRequests.push({
          url: url,
          timestamp: Date.now(),
        });
        console.log(`API Request: ${url}`);
      }
    });

    // Register user
    await page.goto("http://localhost:3000");
    await page.click('button:has-text("Get Started")');
    await page.waitForURL("**/register", { timeout: 5000 });
    await page.fill('input[placeholder="Enter username"]', user.username);
    await page.fill('input[placeholder="Enter password"]', user.password);
    await page.fill('input[placeholder="Confirm password"]', user.password);
    await page.fill(
      'input[placeholder="Enter encryption passphrase"]',
      user.passphrase
    );
    await page.fill('input[placeholder="Confirm passphrase"]', user.passphrase);
    await page.check('input[type="checkbox"]');
    await page.click('button:has-text("Create Account")');

    // Wait for redirect to chat
    await page.waitForURL("**/chat", { timeout: 10000 });
    await expect(page.locator("h1")).toContainText("VoidLink");

    // Clear initial requests (from page load)
    apiRequests.length = 0;
    const startTime = Date.now();

    console.log("\n=== Starting 20-second monitoring period ===");

    // Wait 20 seconds and monitor requests
    await page.waitForTimeout(20000);

    const monitorDuration = Date.now() - startTime;
    console.log(`\n=== Monitoring complete (${monitorDuration}ms) ===`);
    console.log(`Total API requests during monitoring: ${apiRequests.length}`);

    // Analyze requests
    const conversationRequests = apiRequests.filter((r) =>
      r.url.includes("/api/messages/conversation/")
    );
    const contactsRequests = apiRequests.filter(
      (r) => r.url.includes("/api/contacts") && !r.url.includes("request")
    );
    const inboxRequests = apiRequests.filter((r) =>
      r.url.includes("/api/messages/inbox")
    );

    console.log(`\nBreakdown:`);
    console.log(`- Conversation requests: ${conversationRequests.length}`);
    console.log(`- Contacts list requests: ${contactsRequests.length}`);
    console.log(`- Inbox requests: ${inboxRequests.length}`);

    // Assertions
    // Conversation endpoint should NOT be polled
    expect(conversationRequests.length).toBe(0);
    console.log(
      `✓ Conversation polling: ${conversationRequests.length} (expected 0)`
    );

    // Contacts list should NOT be polled (WebSocket handles presence)
    expect(contactsRequests.length).toBe(0);
    console.log(`✓ Contacts polling: ${contactsRequests.length} (expected 0)`);

    // Inbox should NOT be polled (WebSocket handles messages)
    expect(inboxRequests.length).toBe(0);
    console.log(`✓ Inbox polling: ${inboxRequests.length} (expected 0)`);

    // Total requests should be 0 (no polling at all for these endpoints)
    expect(apiRequests.length).toBe(0);
    console.log(`✓ Total API requests: ${apiRequests.length} (expected 0)`);

    console.log("\n✅ No excessive polling detected!");
  });
});
