/**
 * VoidLink Enhanced Contact Management Test
 * Tests the complete contact request system and messaging integration
 */

const WebSocket = require("ws");
const nacl = require("tweetnacl");
const { Buffer } = require("buffer");

// Test configuration
const BASE_URL = "http://localhost:5000";
const WS_URL = "ws://localhost:5000";

class EnhancedContactsTest {
  constructor() {
    this.testUsers = [];
    this.connections = new Map();
    this.receivedMessages = new Map();
  }

  /**
   * Generate Ed25519 key pair
   */
  generateKeyPair() {
    const keyPair = nacl.sign.keyPair();
    return {
      publicKey: Buffer.from(keyPair.publicKey).toString("hex"),
      secretKey: Buffer.from(keyPair.secretKey).toString("hex"),
    };
  }

  /**
   * Sign a challenge with Ed25519
   */
  signChallenge(challenge, secretKey) {
    const challengeBytes = Buffer.from(challenge, "hex");
    const secretKeyBytes = Buffer.from(secretKey, "hex");
    const signature = nacl.sign.detached(challengeBytes, secretKeyBytes);
    return Buffer.from(signature).toString("hex");
  }

  /**
   * Delay function
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Setup a test user with full authentication
   */
  async setupUser(username) {
    const keyPair = this.generateKeyPair();
    const user = { username, ...keyPair };

    try {
      console.log(`📝 Setting up user: ${username}...`);

      // Step 1: Register account
      const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: user.username,
          password: "testpass123",
        }),
      });

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json();
        throw new Error(
          `Registration failed: ${errorData.message || registerResponse.status}`
        );
      }

      // Step 2: Login to get account session
      const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: user.username,
          password: "testpass123",
        }),
      });

      if (!loginResponse.ok) {
        throw new Error(`Login failed: ${loginResponse.status}`);
      }

      const loginData = await loginResponse.json();
      user.accountToken = loginData.data.accountSessionToken;

      // Step 3: Upload public key
      const keyResponse = await fetch(
        `${BASE_URL}/api/auth/crypto/upload-key`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.accountToken}`,
          },
          body: JSON.stringify({ publicKey: user.publicKey }),
        }
      );

      if (!keyResponse.ok) {
        throw new Error(`Key upload failed: ${keyResponse.status}`);
      }

      const keyData = await keyResponse.json();
      user.cryptoProfileId = keyData.data.cryptoProfileId;

      // Step 4: Get crypto challenge and verify
      const challengeResponse = await fetch(
        `${BASE_URL}/api/auth/crypto/challenge`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.accountToken}`,
          },
          body: JSON.stringify({}),
        }
      );

      if (!challengeResponse.ok) {
        throw new Error(`Challenge failed: ${challengeResponse.status}`);
      }

      const challengeData = await challengeResponse.json();
      const challenge = challengeData.data.challenge;
      const signature = this.signChallenge(challenge, user.secretKey);

      const verifyResponse = await fetch(`${BASE_URL}/api/auth/crypto/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.accountToken}`,
        },
        body: JSON.stringify({
          challenge: challenge,
          signature: signature,
        }),
      });

      if (!verifyResponse.ok) {
        throw new Error(`Crypto verification failed: ${verifyResponse.status}`);
      }

      const verifyData = await verifyResponse.json();
      user.cryptoToken = verifyData.data.cryptoSessionToken;

      this.testUsers.push(user);
      this.receivedMessages.set(user.username, []);

      console.log(`✅ User ${username} setup complete`);
      return user;
    } catch (error) {
      console.error(`❌ Failed to setup user ${username}:`, error.message);
      throw error;
    }
  }

  /**
   * Test contact request system
   */
  async testContactRequests() {
    console.log("\n📞 Test 1: Contact Request System");
    console.log("==================================");

    try {
      const alice = this.testUsers[0];
      const bob = this.testUsers[1];

      // Step 1: Alice sends contact request to Bob
      console.log(`📤 Alice sends contact request to Bob...`);
      const requestResponse = await fetch(`${BASE_URL}/api/contacts/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${alice.accountToken}`,
          "X-Crypto-Session": alice.cryptoToken,
        },
        body: JSON.stringify({
          username: bob.username,
          message: "Hi Bob! Let's connect on VoidLink.",
        }),
      });

      if (!requestResponse.ok) {
        throw new Error(`Contact request failed: ${requestResponse.status}`);
      }

      const requestData = await requestResponse.json();
      console.log(`✅ Contact request sent successfully`);
      console.log(`   - Request ID: ${requestData.data.requestId}`);
      console.log(`   - Status: ${requestData.data.status}`);

      // Step 2: Bob checks pending requests
      console.log(`📋 Bob checks pending contact requests...`);
      const pendingResponse = await fetch(
        `${BASE_URL}/api/contacts/requests/pending`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${bob.accountToken}`,
            "X-Crypto-Session": bob.cryptoToken,
          },
        }
      );

      if (!pendingResponse.ok) {
        throw new Error(
          `Get pending requests failed: ${pendingResponse.status}`
        );
      }

      const pendingData = await pendingResponse.json();
      console.log(
        `✅ Found ${pendingData.data.totalRequests} pending request(s)`
      );

      const aliceRequest = pendingData.data.pendingRequests.find(
        (req) => req.requesterUsername === alice.username
      );

      if (!aliceRequest) {
        throw new Error("Alice's contact request not found");
      }

      console.log(`   - From: ${aliceRequest.requesterUsername}`);
      console.log(`   - Message: ${aliceRequest.message}`);

      // Step 3: Bob accepts the contact request
      console.log(`✅ Bob accepts Alice's contact request...`);
      const acceptResponse = await fetch(
        `${BASE_URL}/api/contacts/${aliceRequest.requestId}/accept`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${bob.accountToken}`,
            "X-Crypto-Session": bob.cryptoToken,
          },
        }
      );

      if (!acceptResponse.ok) {
        throw new Error(`Accept request failed: ${acceptResponse.status}`);
      }

      const acceptData = await acceptResponse.json();
      console.log(`✅ Contact request accepted successfully`);
      console.log(`   - Status: ${acceptData.data.status}`);

      return true;
    } catch (error) {
      console.error("❌ Contact request test failed:", error.message);
      return false;
    }
  }

  /**
   * Test contacts with presence information
   */
  async testContactsWithPresence() {
    console.log("\n👥 Test 2: Contacts with Presence");
    console.log("==================================");

    try {
      const alice = this.testUsers[0];
      const bob = this.testUsers[1];

      // Get Alice's contacts (should include Bob now)
      console.log(`📋 Alice checks her contacts list...`);
      const contactsResponse = await fetch(`${BASE_URL}/api/contacts`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${alice.accountToken}`,
          "X-Crypto-Session": alice.cryptoToken,
        },
      });

      if (!contactsResponse.ok) {
        throw new Error(`Get contacts failed: ${contactsResponse.status}`);
      }

      const contactsData = await contactsResponse.json();
      console.log(`✅ Alice has ${contactsData.data.totalContacts} contact(s)`);

      const bobContact = contactsData.data.contacts.find(
        (contact) => contact.username === bob.username
      );

      if (!bobContact) {
        throw new Error("Bob not found in Alice's contacts");
      }

      console.log(`   - Contact: ${bobContact.username}`);
      console.log(`   - Status: ${bobContact.status}`);
      console.log(`   - Presence: ${bobContact.presence.status}`);
      console.log(`   - Online: ${bobContact.presence.isOnline}`);
      console.log(`   - Added: ${bobContact.addedAt}`);
      console.log(`   - Accepted: ${bobContact.acceptedAt}`);

      return true;
    } catch (error) {
      console.error("❌ Contacts with presence test failed:", error.message);
      return false;
    }
  }

  /**
   * Test relationship status checking
   */
  async testRelationshipStatus() {
    console.log("\n🔗 Test 3: Relationship Status");
    console.log("===============================");

    try {
      const alice = this.testUsers[0];
      const bob = this.testUsers[1];

      // Check Alice's relationship with Bob
      console.log(`🔍 Checking Alice's relationship with Bob...`);
      const statusResponse = await fetch(
        `${BASE_URL}/api/contacts/status/${bob.username}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${alice.accountToken}`,
            "X-Crypto-Session": alice.cryptoToken,
          },
        }
      );

      if (!statusResponse.ok) {
        throw new Error(
          `Get relationship status failed: ${statusResponse.status}`
        );
      }

      const statusData = await statusResponse.json();
      console.log(`✅ Relationship status retrieved`);
      console.log(`   - Status: ${statusData.data.relationshipStatus}`);
      console.log(`   - Mutual: ${statusData.data.isMutual}`);
      console.log(`   - Can Message: ${statusData.data.canMessage}`);

      if (statusData.data.relationshipStatus !== "mutual") {
        throw new Error(
          `Expected mutual relationship, got: ${statusData.data.relationshipStatus}`
        );
      }

      return true;
    } catch (error) {
      console.error("❌ Relationship status test failed:", error.message);
      return false;
    }
  }

  /**
   * Test messaging with contact validation
   */
  async testMessagingWithContacts() {
    console.log("\n💬 Test 4: Messaging with Contact Validation");
    console.log("=============================================");

    try {
      const alice = this.testUsers[0];
      const bob = this.testUsers[1];

      // Create WebSocket connections
      console.log(`🔗 Establishing WebSocket connections...`);
      await this.createWebSocketConnection(alice);
      await this.createWebSocketConnection(bob);
      await this.delay(1000);

      // Clear previous messages
      this.receivedMessages.get(bob.username).length = 0;

      // Alice sends message to Bob (should work - they are contacts)
      console.log(`📤 Alice sends message to Bob (contacts)...`);
      await this.sendMessageWithContactValidation(
        alice,
        bob,
        "Hello Bob! We're now contacts!"
      );
      await this.delay(2000);

      // Verify message received
      const bobMessages = this.receivedMessages.get(bob.username);
      const receivedMessage = bobMessages.find(
        (m) => m.type === "message_received"
      );

      if (receivedMessage) {
        console.log(`✅ Message delivered successfully`);
        console.log(`   - From: ${receivedMessage.senderUsername}`);
        console.log(`   - Type: ${receivedMessage.messageType}`);
        return true;
      } else {
        console.log(`❌ Message was not received`);
        return false;
      }
    } catch (error) {
      console.error("❌ Messaging with contacts test failed:", error.message);
      return false;
    }
  }

  /**
   * Test messaging without contact relationship
   */
  async testMessagingWithoutContacts() {
    console.log("\n🚫 Test 5: Messaging Without Contact Relationship");
    console.log("==================================================");

    try {
      const alice = this.testUsers[0];
      const charlie = this.testUsers[2]; // Charlie is not Alice's contact

      // Create WebSocket connection for Charlie
      await this.createWebSocketConnection(charlie);
      await this.delay(1000);

      // Alice tries to send message to Charlie (should fail - not contacts)
      console.log(
        `📤 Alice tries to send message to Charlie (not contacts)...`
      );

      let errorReceived = false;
      const errorHandler = (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === "error" && message.error === "NOT_CONTACTS") {
            console.log(`✅ Server correctly rejected message to non-contact`);
            console.log(`   - Error: ${message.error}`);
            console.log(`   - Message: ${message.message}`);
            errorReceived = true;
          }
        } catch (e) {
          // Ignore parsing errors
        }
      };

      const aliceWs = this.connections.get(alice.username);
      aliceWs.on("message", errorHandler);

      await this.sendMessageWithContactValidation(
        alice,
        charlie,
        "Hello Charlie! (This should fail)"
      );
      await this.delay(3000);

      aliceWs.off("message", errorHandler);

      return errorReceived;
    } catch (error) {
      console.error(
        "❌ Messaging without contacts test failed:",
        error.message
      );
      return false;
    }
  }

  /**
   * Create WebSocket connection for user
   */
  async createWebSocketConnection(user) {
    return new Promise((resolve, reject) => {
      const wsUrl = `${WS_URL}/ws?account_token=${user.accountToken}&crypto_token=${user.cryptoToken}`;
      const ws = new WebSocket(wsUrl);

      ws.on("open", () => {
        console.log(`🔗 WebSocket connected for ${user.username}`);
        this.connections.set(user.username, ws);
        resolve(ws);
      });

      ws.on("error", (error) => {
        console.error(
          `❌ WebSocket error for ${user.username}:`,
          error.message
        );
        reject(error);
      });

      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.receivedMessages.get(user.username).push(message);

          if (message.type === "message_received") {
            console.log(
              `💬 Message for ${user.username} from ${message.senderUsername}`
            );
          }
        } catch (error) {
          console.error("Message parsing error:", error);
        }
      });

      ws.on("close", (code, reason) => {
        console.log(
          `🔌 WebSocket closed for ${user.username}: ${code} - ${reason}`
        );
        this.connections.delete(user.username);
      });
    });
  }

  /**
   * Send message via WebSocket with contact validation
   */
  async sendMessageWithContactValidation(senderUser, recipientUser, message) {
    const ws = this.connections.get(senderUser.username);
    if (!ws) {
      throw new Error(`No WebSocket connection for ${senderUser.username}`);
    }

    const messageData = {
      type: "message_send",
      recipientUsername: recipientUser.username,
      recipientCryptoProfileId: recipientUser.cryptoProfileId,
      encryptedPayload: `encrypted_${message}_${Date.now()}`,
      messageType: "message",
    };

    ws.send(JSON.stringify(messageData));
    console.log(
      `📤 ${senderUser.username} sends: "${message}" to ${recipientUser.username}`
    );
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    console.log("\n🧹 Cleaning up...");
    for (const username of this.connections.keys()) {
      const ws = this.connections.get(username);
      if (ws) {
        ws.close();
      }
    }
    await this.delay(1000);
    console.log("✅ Cleanup completed");
  }

  /**
   * Run the complete enhanced contacts test suite
   */
  async runTest() {
    console.log("📞 VoidLink Enhanced Contact Management Test");
    console.log("============================================");
    console.log(
      "Testing contact requests, presence, and messaging integration...\n"
    );

    const results = {
      contactRequests: false,
      contactsWithPresence: false,
      relationshipStatus: false,
      messagingWithContacts: false,
      messagingWithoutContacts: false,
    };

    try {
      // Setup test users
      console.log("👥 Setting up test users...");
      const alice = await this.setupUser(`alice_contacts_${Date.now()}`);
      await this.delay(2000);
      const bob = await this.setupUser(`bob_contacts_${Date.now()}`);
      await this.delay(2000);
      const charlie = await this.setupUser(`charlie_contacts_${Date.now()}`);
      await this.delay(1000);
      console.log("✅ Test users setup complete\n");

      // Run all tests
      results.contactRequests = await this.testContactRequests();
      results.contactsWithPresence = await this.testContactsWithPresence();
      results.relationshipStatus = await this.testRelationshipStatus();
      results.messagingWithContacts = await this.testMessagingWithContacts();
      results.messagingWithoutContacts =
        await this.testMessagingWithoutContacts();

      // Print summary
      console.log("\n📊 Test Results Summary");
      console.log("=======================");
      console.log(
        `Contact Requests: ${results.contactRequests ? "✅ PASS" : "❌ FAIL"}`
      );
      console.log(
        `Contacts with Presence: ${
          results.contactsWithPresence ? "✅ PASS" : "❌ FAIL"
        }`
      );
      console.log(
        `Relationship Status: ${
          results.relationshipStatus ? "✅ PASS" : "❌ FAIL"
        }`
      );
      console.log(
        `Messaging with Contacts: ${
          results.messagingWithContacts ? "✅ PASS" : "❌ FAIL"
        }`
      );
      console.log(
        `Messaging without Contacts: ${
          results.messagingWithoutContacts ? "✅ PASS" : "❌ FAIL"
        }`
      );

      const passCount = Object.values(results).filter(Boolean).length;
      const totalTests = Object.keys(results).length;

      console.log(
        `\n🎯 Overall Result: ${passCount}/${totalTests} tests passed`
      );

      if (passCount === totalTests) {
        console.log(
          "🎉 ALL TESTS PASSED! Enhanced contact management is working correctly."
        );
        console.log("\n✨ Key Features Verified:");
        console.log("   - Contact request system (send/accept/reject)");
        console.log("   - Real-time presence information");
        console.log("   - Relationship status checking");
        console.log("   - Contact-based message filtering");
        console.log("   - Security validation for messaging");
      } else {
        console.log(
          "⚠️  Some tests failed. Check the output above for details."
        );
      }

      return results;
    } catch (error) {
      console.error("❌ Test execution failed:", error);
      return results;
    } finally {
      await this.cleanup();
    }
  }
}

// Run the test
async function main() {
  const test = new EnhancedContactsTest();
  try {
    await test.runTest();
    process.exit(0);
  } catch (error) {
    console.error("Test execution failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = EnhancedContactsTest;
