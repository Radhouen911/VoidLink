import { expect, test } from "@playwright/test";

test.describe("Simple Smoke Test", () => {
  test("should load the landing page", async ({ page }) => {
    // Just try to load the page
    await page.goto("/");

    // Check if page loaded
    await expect(page.locator("text=VoidLink")).toBeVisible({ timeout: 10000 });

    console.log("✅ Landing page loaded");
  });

  test("should navigate to register page", async ({ page }) => {
    await page.goto("/");

    // Click Get Started
    await page.click("text=Get Started");

    // Should be on register page
    await expect(page).toHaveURL("/register");

    // Should see form
    await expect(page.locator("text=Create Your Account")).toBeVisible();

    console.log("✅ Register page loaded");
  });

  test("should show all register form fields", async ({ page }) => {
    await page.goto("/register");

    // Check all fields exist
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
    await expect(page.locator('input[name="passphrase"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassphrase"]')).toBeVisible();
    await expect(page.locator('input[type="checkbox"]')).toBeVisible();
    await expect(
      page.locator('button:has-text("Create Account")')
    ).toBeVisible();

    console.log("✅ All form fields present");
  });

  test("should be able to fill register form", async ({ page }) => {
    await page.goto("/register");

    const testUser = {
      username: `test_${Date.now()}`,
      password: "TestPass123!",
      passphrase: "test-passphrase-123",
    };

    // Try to fill all fields
    await page.fill('input[name="username"]', testUser.username);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    await page.fill('input[name="passphrase"]', testUser.passphrase);
    await page.fill('input[name="confirmPassphrase"]', testUser.passphrase);
    await page.check('input[type="checkbox"]');

    // Verify fields are filled
    await expect(page.locator('input[name="username"]')).toHaveValue(
      testUser.username
    );
    await expect(page.locator('input[name="password"]')).toHaveValue(
      testUser.password
    );

    console.log("✅ Form can be filled");
  });
});
