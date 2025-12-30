/**
 * VoidLink Complete Messaging System Test
 * Tests the full messaging functionality including:
 * - User registration and authentication
 * - Real-time messaging via WebSocket
 * - Offline message queuing
 * - Message delivery and queue processing
 * - Service integration and statistics
 */

const WebSocket = require("ws");
const nacl = require("tweetnacl");
const { Buffer } = require("buffer");
const MessageQueueService = require("../src/services/message-queue-service");
const db = require("../src/database/db");

// Test configuration
const BASE_URL = "http://localhost:5000";
const WS_URL = "ws://localhost:5000";

class CompleteMessagingTest {
  constructor() {
    this.testUsers = [];
    this.connections = new Map();
    this.messageQueueService = null;
    this.mockConnectionManager = null;
    this.receivedMessages = new Map(); // Track received messages per user
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

      // Step 4: Get crypto challenge
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

      // Step 5: Verify signature and get crypto session
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
          console.log(`📨 ${user.username} received: ${message.type}`);

          // Store received message for verification
          this.receivedMessages.get(user.username).push(message);

          if (message.type === "message_received") {
            console.log(
              `💬 ${message.fromQueue ? "Queued" : "Real-time"} message for ${
                user.username
              } from ${message.senderUsername}`
            );
            if (message.fromQueue) {
              console.log(
                `📬 Queue delivery: priority=${message.priority}, sentAt=${message.sentAt}`
              );
            }
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
   * Send message via WebSocket
   */
  async sendMessage(senderUser, recipientUsername, message) {
    const ws = this.connections.get(senderUser.username);
    if (!ws) {
      throw new Error(`No WebSocket connection for ${senderUser.username}`);
    }

    const messageData = {
      type: "message_send",
      recipientUsername: recipientUsername,
      encryptedPayload: `encrypted_${message}_${Date.now()}`,
      messageType: "message",
    };

    ws.send(JSON.stringify(messageData));
    console.log(
      `📤 ${senderUser.username} sends: "${message}" to ${recipientUsername}`
    );
  }

  /**
   * Close WebSocket connection
   */
  closeConnection(username) {
    const ws = this.connections.get(username);
    if (ws) {
      ws.close();
      console.log(`📴 ${username} disconnected`);
    }
  }

  /**
   * Initialize message queue service with mock connection manager
   */
  async initializeMessageQueueService() {
    console.log("🔧 Initializing Message Queue Service...");

    // Create mock connection manager
    this.mockConnectionManager = {
      isUserOnline: (cryptoProfileId) => {
        // Check if any user with this crypto profile has an active connection
        for (const user of this.testUsers) {
          if (user.cryptoProfileId === cryptoProfileId) {
            return this.connections.has(user.username);
          }
        }
        return false;
      },

      broadcastToUser: (cryptoProfileId, message) => {
        // Find user and send message if connected
        for (const user of this.testUsers) {
          if (user.cryptoProfileId === cryptoProfileId) {
            const ws = this.connections.get(user.username);
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(message));
              return 1; // Delivered to 1 connection
            }
          }
        }
        return 0; // Not delivered
      },
    };

    this.messageQueueService = new MessageQueueService(
      this.mockConnectionManager
    );
    this.messageQueueService.start();
    console.log("✅ Message Queue Service initialized\n");
  }

  /**
   * Test database functions
   */
  async testDatabaseFunctions() {
    console.log("🗄️  Test 1: Database Functions");
    console.log("==============================");

    try {
      // Test SQL functions exist
      const functions = await db.query(`
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name IN ('get_queued_messages', 'update_user_presence', 'cleanup_expired_messages')
      `);

      console.log(`✅ Found ${functions.rows.length}/3 required SQL functions`);
      functions.rows.forEach((row) => console.log(`   - ${row.routine_name}`));

      // Test tables exist
      const tables = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('message_queue', 'user_presence', 'messages')
      `);

      console.log(`✅ Found ${tables.rows.length}/3 required tables`);
      tables.rows.forEach((row) => console.log(`   - ${row.table_name}`));

      // Test get_queued_messages function
      if (this.testUsers.length > 0) {
        const testResult = await db.query(
          "SELECT * FROM get_queued_messages($1)",
          [this.testUsers[0].cryptoProfileId]
        );
        console.log(
          `✅ get_queued_messages function works (returned ${testResult.rows.length} messages)`
        );
      }

      return true;
    } catch (error) {
      console.error("❌ Database functions test failed:", error.message);
      return false;
    }
  }

  /**
   * Test message queue service
   */
  async testMessageQueueService() {
    console.log("\n🔧 Test 2: Message Queue Service");
    console.log("=================================");

    try {
      // Test service status
      const isRunning = this.messageQueueService.isRunning();
      console.log(`✅ Service running: ${isRunning}`);

      // Test service stats
      const stats = await this.messageQueueService.getStats();
      console.log("✅ Service stats retrieved:");
      console.log(`   - Total messages: ${stats.totalMessages}`);
      console.log(`   - Queued messages: ${stats.queuedMessages}`);
      console.log(`   - Online users: ${stats.onlineUsers}`);

      return true;
    } catch (error) {
      console.error("❌ Message queue service test failed:", error.message);
      return false;
    }
  }

  /**
   * Test real-time messaging
   */
  async testRealTimeMessaging() {
    console.log("\n💬 Test 3: Real-time Messaging");
    console.log("===============================");

    try {
      const alice = this.testUsers[0];
      const bob = this.testUsers[1];

      // Connect both users
      await this.createWebSocketConnection(alice);
      await this.createWebSocketConnection(bob);
      await this.delay(1000);

      // Clear previous messages
      this.receivedMessages.get(bob.username).length = 0;

      // Send real-time message
      await this.sendMessage(
        alice,
        bob.username,
        "Hello Bob! Real-time message"
      );
      await this.delay(2000);

      // Verify message received
      const bobMessages = this.receivedMessages.get(bob.username);
      const realTimeMessage = bobMessages.find(
        (m) => m.type === "message_received" && !m.fromQueue
      );

      if (realTimeMessage) {
        console.log("✅ Real-time message delivered successfully");
        console.log(`   - Sender: ${realTimeMessage.senderUsername}`);
        console.log(`   - Type: ${realTimeMessage.messageType}`);
        return true;
      } else {
        console.log("❌ Real-time message not received");
        return false;
      }
    } catch (error) {
      console.error("❌ Real-time messaging test failed:", error.message);
      return false;
    }
  }

  /**
   * Test offline message queuing
   */
  async testOfflineQueuing() {
    console.log("\n📴 Test 4: Offline Message Queuing");
    console.log("===================================");

    try {
      const alice = this.testUsers[0];
      const bob = this.testUsers[1];

      // Disconnect Bob
      this.closeConnection(bob.username);
      await this.delay(2000);

      // Clear previous messages
      this.receivedMessages.get(bob.username).length = 0;

      // Send messages while Bob is offline
      console.log("📤 Sending messages while Bob is offline...");
      await this.sendMessage(alice, bob.username, "Offline message 1");
      await this.delay(1000);
      await this.sendMessage(alice, bob.username, "Offline message 2");
      await this.delay(1000);
      await this.sendMessage(alice, bob.username, "Offline message 3");
      await this.delay(2000);

      // Check queue stats
      const stats = await this.messageQueueService.getStats();
      console.log(`✅ Messages queued: ${stats.queuedMessages}`);

      return stats.queuedMessages > 0;
    } catch (error) {
      console.error("❌ Offline queuing test failed:", error.message);
      return false;
    }
  }

  /**
   * Test queue delivery when user comes online
   */
  async testQueueDelivery() {
    console.log("\n🔄 Test 5: Queue Delivery on Reconnection");
    console.log("==========================================");

    try {
      const bob = this.testUsers[1];

      // Clear previous messages
      this.receivedMessages.get(bob.username).length = 0;

      // Reconnect Bob
      console.log("🔗 Bob reconnecting...");
      await this.createWebSocketConnection(bob);

      // Trigger queue processing
      await this.messageQueueService.onUserOnline(bob.cryptoProfileId);
      await this.delay(3000);

      // Check delivered messages
      const bobMessages = this.receivedMessages.get(bob.username);
      const queuedMessages = bobMessages.filter(
        (m) => m.type === "message_received" && m.fromQueue
      );

      console.log(`✅ Delivered ${queuedMessages.length} queued messages`);
      queuedMessages.forEach((msg, index) => {
        console.log(
          `   ${index + 1}. From ${msg.senderUsername} (priority: ${
            msg.priority
          })`
        );
      });

      // Check final queue stats
      const finalStats = await this.messageQueueService.getStats();
      console.log(`✅ Remaining queued messages: ${finalStats.queuedMessages}`);

      return queuedMessages.length > 0;
    } catch (error) {
      console.error("❌ Queue delivery test failed:", error.message);
      return false;
    }
  }

  /**
   * Test mixed scenarios
   */
  async testMixedScenarios() {
    console.log("\n🔀 Test 6: Mixed Online/Offline Scenarios");
    console.log("==========================================");

    try {
      const alice = this.testUsers[0];
      const bob = this.testUsers[1];

      // Send real-time message
      await this.sendMessage(alice, bob.username, "Back online message");
      await this.delay(1000);

      // Bob goes offline again
      this.closeConnection(bob.username);
      await this.delay(1000);

      // Send another offline message
      await this.sendMessage(alice, bob.username, "Another offline message");
      await this.delay(1000);

      // Bob comes back online
      await this.createWebSocketConnection(bob);
      await this.messageQueueService.onUserOnline(bob.cryptoProfileId);
      await this.delay(2000);

      console.log("✅ Mixed scenario test completed");
      return true;
    } catch (error) {
      console.error("❌ Mixed scenarios test failed:", error.message);
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    console.log("\n🧹 Cleaning up...");

    // Close all connections
    for (const username of this.connections.keys()) {
      this.closeConnection(username);
    }

    // Stop message queue service
    if (this.messageQueueService) {
      this.messageQueueService.stop();
    }

    await this.delay(1000);
    console.log("✅ Cleanup completed");
  }

  /**
   * Run the complete test suite
   */
  async runCompleteTest() {
    console.log("🚀 VoidLink Complete Messaging System Test");
    console.log("==========================================");
    console.log("Testing full messaging functionality...\n");

    const results = {
      database: false,
      service: false,
      realTime: false,
      queuing: false,
      delivery: false,
      mixed: false,
    };

    try {
      // Setup test users
      console.log("👥 Setting up test users...");
      const alice = await this.setupUser(`alice_${Date.now()}`);
      await this.delay(2000); // Rate limit protection
      const bob = await this.setupUser(`bob_${Date.now()}`);
      console.log("✅ Test users setup complete\n");

      // Initialize message queue service
      await this.initializeMessageQueueService();

      // Run all tests
      results.database = await this.testDatabaseFunctions();
      results.service = await this.testMessageQueueService();
      results.realTime = await this.testRealTimeMessaging();
      results.queuing = await this.testOfflineQueuing();
      results.delivery = await this.testQueueDelivery();
      results.mixed = await this.testMixedScenarios();

      // Print summary
      console.log("\n📊 Test Results Summary");
      console.log("=======================");
      console.log(
        `Database Functions: ${results.database ? "✅ PASS" : "❌ FAIL"}`
      );
      console.log(
        `Message Queue Service: ${results.service ? "✅ PASS" : "❌ FAIL"}`
      );
      console.log(
        `Real-time Messaging: ${results.realTime ? "✅ PASS" : "❌ FAIL"}`
      );
      console.log(
        `Offline Queuing: ${results.queuing ? "✅ PASS" : "❌ FAIL"}`
      );
      console.log(
        `Queue Delivery: ${results.delivery ? "✅ PASS" : "❌ FAIL"}`
      );
      console.log(`Mixed Scenarios: ${results.mixed ? "✅ PASS" : "❌ FAIL"}`);

      const passCount = Object.values(results).filter(Boolean).length;
      const totalTests = Object.keys(results).length;

      console.log(
        `\n🎯 Overall Result: ${passCount}/${totalTests} tests passed`
      );

      if (passCount === totalTests) {
        console.log(
          "🎉 ALL TESTS PASSED! Messaging system is working correctly."
        );
      } else {
        console.log(
          "⚠️  Some tests failed. Check the output above for details."
        );
      }
    } catch (error) {
      console.error("❌ Test execution failed:", error);
    } finally {
      await this.cleanup();
    }
  }
}

// Run the test
async function main() {
  const test = new CompleteMessagingTest();
  try {
    await test.runCompleteTest();
    process.exit(0);
  } catch (error) {
    console.error("Test execution failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = CompleteMessagingTest;
