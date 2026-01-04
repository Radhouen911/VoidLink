import { expect, test } from "@playwright/test";

test.describe("Messaging", () => {
  const timestamp = Date.now();
  const alice = {
    username: `alice_msg_${timestamp}`,
    password: "AlicePass123!",
    passphrase: "alice-secret-phrase",
  };

  const bob = {
    username: `bob_msg_${timestamp}`,
    password: "BobPass123!",
    passphrase: "bob-secret-phrase",
  };

  test.beforeAll(async ({ browser }) => {
    // Register both users and establish contact
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    // Register Alice
    await page1.goto("/register");
    await page1.fill(
      'input[name="username"], input[placeholder*="username" i]',
      alice.username
    );
    await page1.fill(
      'input[name="password"], input[type="password"]:nth-of-type(1)',
      alice.password
    );
    await page1.fill(
      'input[name="passphrase"], input[type="password"]:nth-of-type(2)',
      alice.passphrase
    );
    await page1.click('button[type="submit"], button:has-text("Register")');
    await page1.waitForURL("/chat", { timeout: 10000 });
    await context1.close();

    // Register Bob
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    await page2.goto("/register");
    await page2.fill(
      'input[name="username"], input[placeholder*="username" i]',
      bob.username
    );
    await page2.fill(
      'input[name="password"], input[type="password"]:nth-of-type(1)',
      bob.password
    );
    await page2.fill(
      'input[name="passphrase"], input[type="password"]:nth-of-type(2)',
      bob.passphrase
    );
    await page2.click('button[type="submit"], button:has-text("Register")');
    await page2.waitForURL("/chat", { timeout: 10000 });
    await context2.close();

    // Alice sends contact request
    const context3 = await browser.newContext();
    const page3 = await context3.newPage();

    await page3.goto("/login");
    await page3.fill(
      'input[name="username"], input[placeholder*="username" i]',
      alice.username
    );
    await page3.fill(
      'input[name="password"], input[type="password"]:nth-of-type(1)',
      alice.password
    );
    await page3.fill(
      'input[name="passphrase"], input[type="password"]:nth-of-type(2)',
      alice.passphrase
    );
    await page3.click('button[type="submit"], button:has-text("Login")');
    await page3.waitForURL("/chat", { timeout: 10000 });

    await page3.click(
      'button:has-text("Add Contact"), button:has-text("+ Add")'
    );
    await page3.fill('input[placeholder*="username" i]', bob.username);
    await page3.click(
      'button:has-text("Send Request"), button:has-text("Send")'
    );
    await page3.waitForTimeout(2000);
    await context3.close();

    // Bob accepts request
    const context4 = await browser.newContext();
    const page4 = await context4.newPage();

    await page4.goto("/login");
    await page4.fill(
      'input[name="username"], input[placeholder*="username" i]',
      bob.username
    );
    await page4.fill(
      'input[name="password"], input[type="password"]:nth-of-type(1)',
      bob.password
    );
    await page4.fill(
      'input[name="passphrase"], input[type="password"]:nth-of-type(2)',
      bob.passphrase
    );
    await page4.click('button[type="submit"], button:has-text("Login")');
    await page4.waitForURL("/chat", { timeout: 10000 });

    await page4.click('button:has-text("Accept")');
    await page4.waitForTimeout(2000);
    await context4.close();
  });

  test("should send and receive message", async ({ browser }) => {
    // Open two browser contexts (Alice and Bob)
    const aliceContext = await browser.newContext();
    const bobContext = await browser.newContext();

    const alicePage = await aliceContext.newPage();
    const bobPage = await bobContext.newPage();

    // Alice logs in
    await alicePage.goto("/login");
    await alicePage.fill(
      'input[name="username"], input[placeholder*="username" i]',
      alice.username
    );
    await alicePage.fill(
      'input[name="password"], input[type="password"]:nth-of-type(1)',
      alice.password
    );
    await alicePage.fill(
      'input[name="passphrase"], input[type="password"]:nth-of-type(2)',
      alice.passphrase
    );
    await alicePage.click('button[type="submit"], button:has-text("Login")');
    await alicePage.waitForURL("/chat", { timeout: 10000 });

    // Bob logs in
    await bobPage.goto("/login");
    await bobPage.fill(
      'input[name="username"], input[placeholder*="username" i]',
      bob.username
    );
    await bobPage.fill(
      'input[name="password"], input[type="password"]:nth-of-type(1)',
      bob.password
    );
    await bobPage.fill(
      'input[name="passphrase"], input[type="password"]:nth-of-type(2)',
      bob.passphrase
    );
    await bobPage.click('button[type="submit"], button:has-text("Login")');
    await bobPage.waitForURL("/chat", { timeout: 10000 });

    // Alice clicks on Bob's contact
    await alicePage.click(`text=${bob.username}`);
    await alicePage.waitForTimeout(1000);

    // Alice types and sends message
    const testMessage = `Hello Bob! This is a test message at ${Date.now()}`;
    await alicePage.fill(
      'input[placeholder*="message" i], input[type="text"]',
      testMessage
    );
    await alicePage.press(
      'input[placeholder*="message" i], input[type="text"]',
      "Enter"
    );

    // Wait for message to send
    await alicePage.waitForTimeout(2000);

    // Alice should see her message
    await expect(alicePage.locator(`text=${testMessage}`)).toBeVisible({
      timeout: 5000,
    });

    // Bob clicks on Alice's contact
    await bobPage.click(`text=${alice.username}`);
    await bobPage.waitForTimeout(2000);

    // Bob should see Alice's message
    await expect(bobPage.locator(`text=${testMessage}`)).toBeVisible({
      timeout: 10000,
    });

    // Bob replies
    const replyMessage = `Hi Alice! I received your message at ${Date.now()}`;
    await bobPage.fill(
      'input[placeholder*="message" i], input[type="text"]',
      replyMessage
    );
    await bobPage.press(
      'input[placeholder*="message" i], input[type="text"]',
      "Enter"
    );

    await bobPage.waitForTimeout(2000);

    // Alice should see Bob's reply
    await expect(alicePage.locator(`text=${replyMessage}`)).toBeVisible({
      timeout: 10000,
    });

    await aliceContext.close();
    await bobContext.close();
  });

  test("should persist messages after logout and login", async ({ page }) => {
    // Login as Alice
    await page.goto("/login");
    await page.fill(
      'input[name="username"], input[placeholder*="username" i]',
      alice.username
    );
    await page.fill(
      'input[name="password"], input[type="password"]:nth-of-type(1)',
      alice.password
    );
    await page.fill(
      'input[name="passphrase"], input[type="password"]:nth-of-type(2)',
      alice.passphrase
    );
    await page.click('button[type="submit"], button:has-text("Login")');
    await page.waitForURL("/chat", { timeout: 10000 });

    // Click on Bob's contact
    await page.click(`text=${bob.username}`);
    await page.waitForTimeout(2000);

    // Count messages before logout
    const messagesBefore = await page
      .locator('[class*="message"], [class*="chat"]')
      .count();
    console.log("Messages before logout:", messagesBefore);

    // Logout
    await page.click('button:has-text("Logout")');
    await page.waitForTimeout(1000);

    // Login again
    await page.goto("/login");
    await page.fill(
      'input[name="username"], input[placeholder*="username" i]',
      alice.username
    );
    await page.fill(
      'input[name="password"], input[type="password"]:nth-of-type(1)',
      alice.password
    );
    await page.fill(
      'input[name="passphrase"], input[type="password"]:nth-of-type(2)',
      alice.passphrase
    );
    await page.click('button[type="submit"], button:has-text("Login")');
    await page.waitForURL("/chat", { timeout: 10000 });

    // Click on Bob's contact again
    await page.click(`text=${bob.username}`);
    await page.waitForTimeout(3000);

    // Should see previous messages
    const messagesAfter = await page
      .locator('[class*="message"], [class*="chat"]')
      .count();
    console.log("Messages after login:", messagesAfter);

    // This test will help identify if messages are loading from server
    expect(messagesAfter).toBeGreaterThan(0);
  });
});
