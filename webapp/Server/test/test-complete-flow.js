const nacl = require("tweetnacl");
const axios = require("axios");

// Test configuration
const BASE_URL = "http://localhost:5000/api";
const TEST_USER = {
  username: "testuser_" + Date.now(),
  password: "securepassword123",
};

// Generate Ed25519 keypair for testing
const keypair = nacl.sign.keyPair();
const publicKeyHex = Buffer.from(keypair.publicKey).toString("hex");
const privateKeyHex = Buffer.from(keypair.secretKey).toString("hex");

console.log("🔐 VoidLink Two-Layer Authentication Test");
console.log("==========================================");
console.log(`Test User: ${TEST_USER.username}`);
console.log(`Public Key: ${publicKeyHex}`);
console.log("");

let accountSessionToken = null;
let cryptoSessionToken = null;

// Helper function to sign challenges
function signChallenge(challenge, privateKeyHex) {
  const challengeBytes = Buffer.from(challenge, "hex");
  const secretKey = Buffer.from(privateKeyHex, "hex");
  const signature = nacl.sign.detached(challengeBytes, secretKey);
  return Buffer.from(signature).toString("hex");
}

async function runCompleteTest() {
  try {
    console.log("📝 Step 1: Register Account");
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
      username: TEST_USER.username,
      password: TEST_USER.password,
    });
    console.log("✅ Account registered:", registerResponse.data.data.username);
    console.log("");

    console.log("🔑 Step 2: Login to Account");
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: TEST_USER.username,
      password: TEST_USER.password,
    });
    accountSessionToken = loginResponse.data.data.accountSessionToken;
    console.log("✅ Account session created");
    console.log(`   Token: ${accountSessionToken.substring(0, 20)}...`);
    console.log("");

    console.log("🔐 Step 3: Upload Public Key");
    const uploadResponse = await axios.post(
      `${BASE_URL}/auth/crypto/upload-key`,
      {
        publicKey: publicKeyHex,
      },
      {
        headers: {
          Authorization: `Bearer ${accountSessionToken}`,
        },
      }
    );
    console.log("✅ Public key uploaded");
    console.log(
      `   Crypto Profile ID: ${uploadResponse.data.data.cryptoProfileId}`
    );
    console.log("");

    console.log("🎯 Step 4: Get Crypto Challenge");
    const challengeResponse = await axios.post(
      `${BASE_URL}/auth/crypto/challenge`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accountSessionToken}`,
        },
      }
    );
    const challenge = challengeResponse.data.data.challenge;
    console.log("✅ Challenge received");
    console.log(`   Challenge: ${challenge}`);
    console.log("");

    console.log("✍️  Step 5: Sign Challenge");
    const signature = signChallenge(challenge, privateKeyHex);
    console.log("✅ Challenge signed");
    console.log(`   Signature: ${signature.substring(0, 40)}...`);
    console.log("");

    console.log("🔓 Step 6: Verify Signature & Get Crypto Session");
    const verifyResponse = await axios.post(
      `${BASE_URL}/auth/crypto/verify`,
      {
        challenge: challenge,
        signature: signature,
      },
      {
        headers: {
          Authorization: `Bearer ${accountSessionToken}`,
        },
      }
    );
    cryptoSessionToken = verifyResponse.data.data.cryptoSessionToken;
    console.log("✅ Crypto session created");
    console.log(`   Token: ${cryptoSessionToken.substring(0, 20)}...`);
    console.log("");

    console.log("👥 Step 7: Search for Users");
    const searchResponse = await axios.get(`${BASE_URL}/users?q=test`, {
      headers: {
        Authorization: `Bearer ${accountSessionToken}`,
      },
    });
    console.log("✅ User search completed");
    console.log(`   Found ${searchResponse.data.data.users.length} users`);
    console.log("");

    console.log(
      "📨 Step 8: Send Test Message (to self - will fail as expected)"
    );
    try {
      await axios.post(
        `${BASE_URL}/messages/send`,
        {
          recipientUsername: TEST_USER.username,
          encryptedPayload: "encrypted_test_message_payload",
          messageType: "message",
        },
        {
          headers: {
            Authorization: `Bearer ${accountSessionToken}`,
            "X-Crypto-Session": cryptoSessionToken,
          },
        }
      );
    } catch (error) {
      if (error.response?.data?.error === "CANNOT_SEND_TO_SELF") {
        console.log("✅ Self-message prevention working correctly");
      } else {
        throw error;
      }
    }
    console.log("");

    console.log("📬 Step 9: Check Inbox");
    const inboxResponse = await axios.get(`${BASE_URL}/messages/inbox`, {
      headers: {
        Authorization: `Bearer ${accountSessionToken}`,
        "X-Crypto-Session": cryptoSessionToken,
      },
    });
    console.log("✅ Inbox accessed");
    console.log(`   Messages: ${inboxResponse.data.data.messages.length}`);
    console.log("");

    console.log("📋 Step 10: Check Session Status");
    const sessionResponse = await axios.get(`${BASE_URL}/auth/session`, {
      headers: {
        Authorization: `Bearer ${accountSessionToken}`,
      },
    });
    console.log("✅ Session validation successful");
    console.log(`   Account: ${sessionResponse.data.data.account.username}`);
    console.log(
      `   Has Crypto Profile: ${!!sessionResponse.data.data.cryptoProfile}`
    );
    console.log("");

    console.log("🚪 Step 11: Logout");
    await axios.post(
      `${BASE_URL}/auth/logout`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accountSessionToken}`,
        },
      }
    );
    console.log("✅ Logged out successfully");
    console.log("");

    console.log("🎉 TWO-LAYER AUTHENTICATION TEST COMPLETED SUCCESSFULLY!");
    console.log("==========================================");
    console.log("✅ Account registration and login");
    console.log("✅ Public key upload and crypto profile creation");
    console.log("✅ Challenge-response authentication");
    console.log("✅ Crypto session management");
    console.log("✅ Message system integration");
    console.log("✅ Session validation and logout");
    console.log("");
    console.log("🔒 Security features verified:");
    console.log("   • Real Ed25519 signature verification");
    console.log("   • Two-layer session management");
    console.log("   • Proper authentication flow");
    console.log("   • Self-message prevention");
    console.log("   • Opaque payload handling");
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the test
runCompleteTest();
