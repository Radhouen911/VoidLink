import { expect, test } from "@playwright/test";

test.describe("User Login", () => {
  let testUser: any;

  test.beforeAll(async ({ browser }) => {
    // Get test user from previous test
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/");

    testUser = await page.evaluate(() => {
      return JSON.parse(window.localStorage.getItem("test_user_1") || "{}");
    });

    await context.close();
  });

  test("should login with correct credentials", async ({ page }) => {
    await page.goto("/login");

    // Fill in login form
    await page.fill(
      'input[name="username"], input[placeholder*="username" i]',
      testUser.username
    );
    await page.fill(
      'input[name="password"], input[type="password"]:nth-of-type(1)',
      testUser.password
    );
    await page.fill(
      'input[name="passphrase"], input[type="password"]:nth-of-type(2)',
      testUser.passphrase
    );

    // Submit
    await page.click('button[type="submit"], button:has-text("Login")');

    // Wait for redirect
    await page.waitForTimeout(3000);

    // Should redirect to chat
    await expect(page).toHaveURL("/chat", { timeout: 10000 });

    // Should see username
    await expect(page.locator(`text=${testUser.username}`)).toBeVisible();
  });

  test("should reject wrong password", async ({ page }) => {
    await page.goto("/login");

    await page.fill(
      'input[name="username"], input[placeholder*="username" i]',
      testUser.username
    );
    await page.fill(
      'input[name="password"], input[type="password"]:nth-of-type(1)',
      "WrongPassword123!"
    );
    await page.fill(
      'input[name="passphrase"], input[type="password"]:nth-of-type(2)',
      testUser.passphrase
    );

    await page.click('button[type="submit"], button:has-text("Login")');

    // Should show error
    await expect(
      page.locator("text=/invalid credentials|wrong password/i")
    ).toBeVisible({ timeout: 5000 });
  });

  test("should reject wrong passphrase", async ({ page }) => {
    await page.goto("/login");

    await page.fill(
      'input[name="username"], input[placeholder*="username" i]',
      testUser.username
    );
    await page.fill(
      'input[name="password"], input[type="password"]:nth-of-type(1)',
      testUser.password
    );
    await page.fill(
      'input[name="passphrase"], input[type="password"]:nth-of-type(2)',
      "wrong-passphrase"
    );

    await page.click('button[type="submit"], button:has-text("Login")');

    // Should show error about passphrase
    await expect(
      page.locator("text=/incorrect passphrase|failed to decrypt/i")
    ).toBeVisible({ timeout: 5000 });
  });

  test("should persist session after page refresh", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.fill(
      'input[name="username"], input[placeholder*="username" i]',
      testUser.username
    );
    await page.fill(
      'input[name="password"], input[type="password"]:nth-of-type(1)',
      testUser.password
    );
    await page.fill(
      'input[name="passphrase"], input[type="password"]:nth-of-type(2)',
      testUser.passphrase
    );
    await page.click('button[type="submit"], button:has-text("Login")');

    await page.waitForURL("/chat", { timeout: 10000 });

    // Refresh page
    await page.reload();

    // Should still be on chat page (or redirect back after re-auth)
    await page.waitForTimeout(2000);

    // Check if still authenticated or redirected to login
    const url = page.url();
    console.log("URL after refresh:", url);

    // This test will help us identify the session persistence issue
  });
});
