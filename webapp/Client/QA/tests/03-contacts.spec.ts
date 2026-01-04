import { expect, test } from "@playwright/test";

test.describe("Contact Management", () => {
  const timestamp = Date.now();
  const user1 = {
    username: `alice_${timestamp}`,
    password: "AlicePass123!",
    passphrase: "alice-secret-phrase",
  };

  const user2 = {
    username: `bob_${timestamp}`,
    password: "BobPass123!",
    passphrase: "bob-secret-phrase",
  };

  test("should register two users", async ({ browser }) => {
    // Register User 1 (Alice)
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    await page1.goto("/register");
    await page1.fill(
      'input[name="username"], input[placeholder*="username" i]',
      user1.username
    );
    await page1.fill(
      'input[name="password"], input[type="password"]:nth-of-type(1)',
      user1.password
    );
    await page1.fill(
      'input[name="passphrase"], input[type="password"]:nth-of-type(2)',
      user1.passphrase
    );
    await page1.click('button[type="submit"], button:has-text("Register")');

    await page1.waitForURL("/chat", { timeout: 10000 });
    await expect(page1.locator(`text=${user1.username}`)).toBeVisible();

    await context1.close();

    // Register User 2 (Bob)
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    await page2.goto("/register");
    await page2.fill(
      'input[name="username"], input[placeholder*="username" i]',
      user2.username
    );
    await page2.fill(
      'input[name="password"], input[type="password"]:nth-of-type(1)',
      user2.password
    );
    await page2.fill(
      'input[name="passphrase"], input[type="password"]:nth-of-type(2)',
      user2.passphrase
    );
    await page2.click('button[type="submit"], button:has-text("Register")');

    await page2.waitForURL("/chat", { timeout: 10000 });
    await expect(page2.locator(`text=${user2.username}`)).toBeVisible();

    await context2.close();

    // Store users for next tests
    const storageContext = await browser.newContext();
    const storagePage = await storageContext.newPage();
    await storagePage.goto("/");
    await storagePage.evaluate(
      (users) => {
        window.localStorage.setItem(
          "test_user_alice",
          JSON.stringify(users.user1)
        );
        window.localStorage.setItem(
          "test_user_bob",
          JSON.stringify(users.user2)
        );
      },
      { user1, user2 }
    );
    await storageContext.close();
  });

  test("should send contact request", async ({ browser }) => {
    // Alice sends request to Bob
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login as Alice
    await page.goto("/login");
    await page.fill(
      'input[name="username"], input[placeholder*="username" i]',
      user1.username
    );
    await page.fill(
      'input[name="password"], input[type="password"]:nth-of-type(1)',
      user1.password
    );
    await page.fill(
      'input[name="passphrase"], input[type="password"]:nth-of-type(2)',
      user1.passphrase
    );
    await page.click('button[type="submit"], button:has-text("Login")');

    await page.waitForURL("/chat", { timeout: 10000 });

    // Click Add Contact
    await page.click(
      'button:has-text("Add Contact"), button:has-text("+ Add")'
    );

    // Fill in Bob's username
    await page.fill('input[placeholder*="username" i]', user2.username);
    await page.fill('input[placeholder*="message" i]', "Hi Bob! Let's connect");

    // Send request
    await page.click(
      'button:has-text("Send Request"), button:has-text("Send")'
    );

    // Should show success toast
    await expect(
      page.locator("text=/request sent|sent successfully/i")
    ).toBeVisible({ timeout: 5000 });

    await context.close();
  });

  test("should see and accept contact request", async ({ browser }) => {
    // Bob logs in and accepts Alice's request
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login as Bob
    await page.goto("/login");
    await page.fill(
      'input[name="username"], input[placeholder*="username" i]',
      user2.username
    );
    await page.fill(
      'input[name="password"], input[type="password"]:nth-of-type(1)',
      user2.password
    );
    await page.fill(
      'input[name="passphrase"], input[type="password"]:nth-of-type(2)',
      user2.passphrase
    );
    await page.click('button[type="submit"], button:has-text("Login")');

    await page.waitForURL("/chat", { timeout: 10000 });

    // Should see pending request
    await expect(page.locator("text=/Pending Requests/i")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator(`text=${user1.username}`)).toBeVisible();

    // Click Accept
    await page.click('button:has-text("Accept")');

    // Should show success toast
    await expect(
      page.locator("text=/accepted|accept successfully/i")
    ).toBeVisible({ timeout: 5000 });

    // Should see Alice in contacts
    await expect(page.locator("text=/Contacts \\(1\\)/i")).toBeVisible({
      timeout: 5000,
    });

    await context.close();
  });

  test("should see contact in both users lists", async ({ browser }) => {
    // Check Alice's contacts
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    await page1.goto("/login");
    await page1.fill(
      'input[name="username"], input[placeholder*="username" i]',
      user1.username
    );
    await page1.fill(
      'input[name="password"], input[type="password"]:nth-of-type(1)',
      user1.password
    );
    await page1.fill(
      'input[name="passphrase"], input[type="password"]:nth-of-type(2)',
      user1.passphrase
    );
    await page1.click('button[type="submit"], button:has-text("Login")');

    await page1.waitForURL("/chat", { timeout: 10000 });

    // Alice should see Bob in contacts
    await expect(page1.locator("text=/Contacts \\(1\\)/i")).toBeVisible({
      timeout: 5000,
    });
    await expect(page1.locator(`text=${user2.username}`)).toBeVisible();

    await context1.close();
  });
});
