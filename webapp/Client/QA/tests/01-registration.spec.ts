import { expect, test } from "@playwright/test";

test.describe("User Registration and Login", () => {
  const timestamp = Date.now();
  const testUser = {
    username: `testuser_${timestamp}`,
    password: "TestPassword123!",
    passphrase: "my-super-secret-passphrase-2024",
  };

  test("should register a new user and login", async ({ page }) => {
    // Enable console logging
    page.on("console", (msg) => console.log("BROWSER:", msg.text()));

    // ===== REGISTRATION =====
    console.log("Starting registration...");

    // Navigate to landing page
    await page.goto("/");

    // Click Get Started
    await page.click("text=Get Started");

    // Should be on register page
    await expect(page).toHaveURL("/register");
    console.log("✅ On register page");

    // Fill in ALL form fields
    await page.fill('input[name="username"]', testUser.username);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    await page.fill('input[name="passphrase"]', testUser.passphrase);
    await page.fill('input[name="confirmPassphrase"]', testUser.passphrase);
    console.log("✅ Form filled");

    // Check the acknowledgment checkbox
    await page.check('input[type="checkbox"]');
    console.log("✅ Checkbox checked");

    // Submit form
    await page.click('button:has-text("Create Account")');
    console.log("✅ Form submitted");

    // Wait for redirect to login page
    await page.waitForURL("/login", { timeout: 30000 });
    console.log("✅ Redirected to login page");

    // ===== LOGIN =====
    console.log("Starting login...");

    // Fill in login form
    await page.fill('input[name="username"]', testUser.username);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="passphrase"]', testUser.passphrase);
    console.log("✅ Login form filled");

    // Submit login
    await page.click('button:has-text("Login"), button[type="submit"]');
    console.log("✅ Login submitted");

    // Wait for redirect to chat page
    await page.waitForURL("/chat", { timeout: 30000 });
    console.log("✅ Redirected to chat page");

    // Verify we're on chat page
    await expect(page.locator(`text=${testUser.username}`)).toBeVisible({
      timeout: 5000,
    });
    console.log("✅ Username visible");

    // Should see "Connected" indicator (WebSocket)
    await expect(page.locator("text=Connected")).toBeVisible({
      timeout: 10000,
    });
    console.log("✅ WebSocket connected");

    // Should see empty contacts
    await expect(page.locator("text=Contacts (0)")).toBeVisible({
      timeout: 5000,
    });
    console.log("✅ Contacts list visible");

    // Store test user for other tests
    await page.evaluate((user) => {
      window.localStorage.setItem("test_user_1", JSON.stringify(user));
    }, testUser);

    console.log("✅ Registration and login test passed!");
  });

  test("should not allow duplicate username", async ({ page }) => {
    await page.goto("/register");

    // Try to register with same username
    await page.fill('input[name="username"]', testUser.username);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    await page.fill('input[name="passphrase"]', testUser.passphrase);
    await page.fill('input[name="confirmPassphrase"]', testUser.passphrase);
    await page.check('input[type="checkbox"]');

    await page.click('button:has-text("Create Account")');

    // Should show error toast
    await expect(
      page.locator("text=/already exists|already taken/i")
    ).toBeVisible({ timeout: 10000 });
  });

  test("should validate password strength", async ({ page }) => {
    await page.goto("/register");

    await page.fill('input[name="username"]', `user_${Date.now()}`);
    await page.fill('input[name="password"]', "123"); // Weak password
    await page.fill('input[name="confirmPassword"]', "123");
    await page.fill('input[name="passphrase"]', "passphrase");
    await page.fill('input[name="confirmPassphrase"]', "passphrase");

    await page.click('button:has-text("Create Account")');

    // Should show validation error (client-side)
    await expect(
      page.locator("text=/password.*8|must be at least 8/i")
    ).toBeVisible({ timeout: 5000 });
  });
});
