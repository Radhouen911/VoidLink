import { expect, test } from "@playwright/test";

test("Complete flow: Register 2 users, add contacts, send messages", async ({
  browser,
}) => {
  const timestamp = Date.now();

  const alice = {
    username: `alice_${timestamp}`,
    password: "AlicePass123!",
    passphrase: "alice-secret-passphrase",
  };

  const bob = {
    username: `bob_${timestamp}`,
    password: "BobPass123!",
    passphrase: "bob-secret-passphrase",
  };

  // ========== STEP 1: REGISTER ALICE ==========
  console.log("\n========== REGISTERING ALICE ==========");
  const aliceContext = await browser.newContext();
  const alicePage = await aliceContext.newPage();

  await alicePage.goto("http://localhost:3000/register");
  await alicePage.waitForLoadState("networkidle");

  // Fill registration form
  await alicePage
    .locator('input[placeholder="Enter username"]')
    .fill(alice.username);
  await alicePage
    .locator('input[placeholder="Enter password"]')
    .first()
    .fill(alice.password);
  await alicePage
    .locator('input[placeholder="Confirm password"]')
    .fill(alice.password);
  await alicePage
    .locator('input[placeholder="Enter encryption passphrase"]')
    .fill(alice.passphrase);
  await alicePage
    .locator('input[placeholder="Confirm passphrase"]')
    .fill(alice.passphrase);
  await alicePage.locator('input[type="checkbox"]').check();

  // Click register button
  await alicePage.locator('button:has-text("Create Account")').click();

  // Wait for auto-login and redirect to chat
  await alicePage.waitForURL("http://localhost:3000/chat", { timeout: 30000 });
  await expect(alicePage.locator(`text=${alice.username}`)).toBeVisible({
    timeout: 10000,
  });
  console.log("✅ Alice registered and auto-logged in");

  // ========== STEP 2: REGISTER BOB ==========
  console.log("\n========== REGISTERING BOB ==========");
  const bobContext = await browser.newContext();
  const bobPage = await bobContext.newPage();

  await bobPage.goto("http://localhost:3000/register");
  await bobPage.waitForLoadState("networkidle");

  await bobPage
    .locator('input[placeholder="Enter username"]')
    .fill(bob.username);
  await bobPage
    .locator('input[placeholder="Enter password"]')
    .first()
    .fill(bob.password);
  await bobPage
    .locator('input[placeholder="Confirm password"]')
    .fill(bob.password);
  await bobPage
    .locator('input[placeholder="Enter encryption passphrase"]')
    .fill(bob.passphrase);
  await bobPage
    .locator('input[placeholder="Confirm passphrase"]')
    .fill(bob.passphrase);
  await bobPage.locator('input[type="checkbox"]').check();
  await bobPage.locator('button:has-text("Create Account")').click();

  await bobPage.waitForURL("http://localhost:3000/chat", { timeout: 30000 });
  await expect(bobPage.locator(`text=${bob.username}`)).toBeVisible({
    timeout: 10000,
  });
  console.log("✅ Bob registered and auto-logged in");

  // ========== STEP 3: ALICE SENDS CONTACT REQUEST TO BOB ==========
  console.log("\n========== ALICE SENDS CONTACT REQUEST ==========");
  await alicePage.locator('button:has-text("Add Contact")').click();
  await alicePage.waitForTimeout(500);

  // Fill in Bob's username in the modal
  await alicePage
    .locator('input[placeholder="Enter username"]')
    .last()
    .fill(bob.username);
  await alicePage.locator('button:has-text("Send Request")').click();
  await alicePage.waitForTimeout(2000);
  console.log("✅ Alice sent contact request to Bob");

  // ========== STEP 4: BOB ACCEPTS CONTACT REQUEST ==========
  console.log("\n========== BOB ACCEPTS CONTACT REQUEST ==========");

  // Wait for polling to fetch the request (polls every 3 seconds)
  console.log("Waiting for contact request to appear (polling every 3s)...");
  await bobPage.waitForTimeout(4000);

  // Check if pending request section is visible
  const pendingSection = bobPage.locator("text=Pending Requests");
  const hasPending = await pendingSection.isVisible().catch(() => false);
  console.log("Pending requests section visible:", hasPending);

  if (!hasPending) {
    console.log("No pending requests visible, taking screenshot...");
    await bobPage.screenshot({
      path: "test-results/bob-no-pending.png",
      fullPage: true,
    });
  }

  // Look for Accept button
  const acceptButton = bobPage.locator('button:has-text("Accept")').first();
  await expect(acceptButton).toBeVisible({ timeout: 15000 });
  await acceptButton.click();
  await bobPage.waitForTimeout(2000);
  console.log("✅ Bob accepted Alice's contact request");

  // ========== STEP 5: ALICE SENDS MESSAGE TO BOB ==========
  console.log("\n========== ALICE SENDS MESSAGE ==========");

  // Wait for contact list to update after acceptance
  await alicePage.waitForTimeout(2000);

  // Click on Bob's contact (contacts show automatically in sidebar)
  await alicePage.locator(`button:has-text("${bob.username}")`).click();
  await alicePage.waitForTimeout(1000);

  // Type and send message
  const aliceMessage = `Hello Bob! Test message from Alice at ${Date.now()}`;
  await alicePage
    .locator('input[placeholder="Type a message..."]')
    .fill(aliceMessage);
  await alicePage
    .locator('input[placeholder="Type a message..."]')
    .press("Enter");
  await alicePage.waitForTimeout(2000);
  console.log("✅ Alice sent message:", aliceMessage);

  // ========== STEP 6: BOB RECEIVES MESSAGE ==========
  console.log("\n========== BOB CHECKS FOR MESSAGE ==========");

  // Click on Alice's contact to open conversation
  await bobPage.locator(`button:has-text("${alice.username}")`).click();

  // Wait for message polling to fetch it (polls every 2 seconds)
  console.log("Waiting for message to appear (polling every 2s)...");
  await bobPage.waitForTimeout(4000);

  // Check if message is visible
  const messageVisible = await bobPage
    .locator(`text=${aliceMessage}`)
    .isVisible()
    .catch(() => false);

  if (messageVisible) {
    console.log("✅ Bob received Alice's message!");
  } else {
    console.log("❌ Bob did NOT receive Alice's message");
    await bobPage.screenshot({
      path: "test-results/bob-no-message.png",
      fullPage: true,
    });
  }

  // ========== STEP 7: BOB SENDS REPLY ==========
  console.log("\n========== BOB SENDS REPLY ==========");
  const bobMessage = `Hi Alice! Reply from Bob at ${Date.now()}`;
  await bobPage
    .locator('input[placeholder="Type a message..."]')
    .fill(bobMessage);
  await bobPage
    .locator('input[placeholder="Type a message..."]')
    .press("Enter");
  await bobPage.waitForTimeout(2000);
  console.log("✅ Bob sent reply:", bobMessage);

  // ========== STEP 8: ALICE RECEIVES REPLY ==========
  console.log("\n========== ALICE CHECKS FOR REPLY ==========");
  await alicePage.waitForTimeout(2000);

  const replyVisible = await alicePage
    .locator(`text=${bobMessage}`)
    .isVisible()
    .catch(() => false);

  if (replyVisible) {
    console.log("✅ Alice received Bob's reply!");
  } else {
    console.log("❌ Alice did NOT receive Bob's reply");
    await alicePage.screenshot({
      path: "test-results/alice-no-reply.png",
      fullPage: true,
    });
  }

  // ========== CLEANUP ==========
  await aliceContext.close();
  await bobContext.close();

  console.log("\n========== TEST COMPLETE ==========");
  console.log("Summary:");
  console.log("- Alice registered: ✅");
  console.log("- Bob registered: ✅");
  console.log("- Contact request sent: ✅");
  console.log("- Contact request accepted: ✅");
  console.log("- Alice sent message:", messageVisible ? "✅" : "❌");
  console.log("- Bob received message:", messageVisible ? "✅" : "❌");
  console.log("- Bob sent reply:", replyVisible ? "✅" : "❌");
  console.log("- Alice received reply:", replyVisible ? "✅" : "❌");

  // Fail test if messages didn't work
  expect(messageVisible).toBe(true);
  expect(replyVisible).toBe(true);
});
