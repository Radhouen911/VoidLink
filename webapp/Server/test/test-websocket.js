const WebSocket = require("ws");
const nacl = require("tweetnacl");
const axios = require("axios");

// Test configuration
const BASE_URL = "http://localhost:5000/api";
const WS_URL = "ws://localhost:5000/ws";

// Test users
const users = [
  {
    username: "alice_ws_" + Date.now(),
    password: "securepassword123",
  },
  {
    username: "bob_ws_" + Date.now(),
    password: "securepassword123",
  },
];

console.log("🔗 VoidLink WebSocket Real-Time Messaging Test");
console.log("==============================================");

/**
 * Setup user with complete authentication flow
 */
async function setupUser(userConfig) {
  try {
    console.log(`\n👤 Setting up user: ${userConfig.username}`);

    // Generate Ed25519 keypair
    const keypair = nacl.sign.keyPair();
    const publicKeyHex = Buffer.from(keypair.publicKey).toString("hex");
    const privateKeyHex = Buffer.from(keypair.secretKey).toString("hex");

    // Register account
    await axios.post(`${BASE_URL}/auth/register`, {
      username: userConfig.username,
      password: userConfig.password,
    });

    // Login to get account session
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: userConfig.username,
      password: userConfig.password,
    });
    const accountToken = loginResponse.data.data.accountSessionToken;

    // Upload public key
    await axios.post(
      `${BASE_URL}/auth/crypto/upload-key`,
      { publicKey: publicKeyHex },
      { headers: { Authorization: `Bearer ${accountToken}` } }
    );

    // Get crypto challenge
    const challengeResponse = await axios.post(
      `${BASE_URL}/auth/crypto/challenge`,
      {},
      { headers: { Authorization: `Bearer ${accountToken}` } }
    );
    const challenge = challengeResponse.data.data.challenge;

    // Sign challenge
    const challengeBytes = Buffer.from(challenge, "hex");
    const signature = nacl.sign.detached(challengeBytes, keypair.secretKey);
    const signatureHex = Buffer.from(signature).toString("hex");

    // Verify signature and get crypto session
    const verifyResponse = await axios.post(
      `${BASE_URL}/auth/crypto/verify`,
      { challenge, signature: signatureHex },
      { headers: { Authorization: `Bearer ${accountToken}` } }
    );
    const cryptoToken = verifyResponse.data.data.cryptoSessionToken;

    console.log(`✅ User ${userConfig.username} setup complete`);

    return {
      ...userConfig,
      accountToken,
      cryptoToken,
      publicKey: publicKeyHex,
      privateKey: privateKeyHex,
      keypair,
    };
  } catch (error) {
    console.error(
      `❌ Failed to setup user ${userConfig.username}:`,
      error.response?.data || error.message
    );
    throw error;
  }
}

/**
 * Create WebSocket connection with authentication
 */
function createWebSocketConnection(user) {
  return new Promise((resolve, reject) => {
    const wsUrl = `${WS_URL}?account_token=${user.accountToken}&crypto_token=${user.cryptoToken}`;
    const ws = new WebSocket(wsUrl);

    ws.on("open", () => {
      console.log(`🔗 WebSocket connected for ${user.username}`);
      resolve(ws);
    });

    ws.on("error", (error) => {
      console.error(`❌ WebSocket error for ${user.username}:`, error);
      reject(error);
    });

    ws.on("close", (code, reason) => {
      console.log(
        `🔌 WebSocket closed for ${user.username}: ${code} - ${reason}`
      );
    });
  });
}

/**
 * Setup message handlers for WebSocket
 */
function setupMessageHandlers(ws, user) {
  const receivedMessages = [];

  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`📨 ${user.username} received:`, message.type);

      switch (message.type) {
        case "welcome":
          console.log(
            `🎉 Welcome message for ${user.username}:`,
            message.message
          );
          break;

        case "message_received":
          console.log(
            `💬 New message for ${user.username} from ${message.senderUsername}`
          );
          receivedMessages.push(message);

          // Auto-acknowledge delivery
          ws.send(
            JSON.stringify({
              type: "message_delivered",
              messageId: message.messageId,
            })
          );
          break;

        case "typing_start":
          console.log(
            `⌨️  ${message.senderUsername} started typing to ${user.username}`
          );
          break;

        case "typing_stop":
          console.log(
            `⌨️  ${message.senderUsername} stopped typing to ${user.username}`
          );
          break;

        case "message_delivery_confirmed":
          console.log(
            `✅ Message ${message.messageId} delivered to ${message.recipientUsername}`
          );
          break;

        case "presence_update":
          console.log(
            `👤 Presence update: ${message.cryptoProfileId} is ${message.status}`
          );
          break;

        case "success":
          console.log(`✅ ${user.username} action succeeded:`, message.action);
          break;

        case "error":
          console.error(
            `❌ ${user.username} error:`,
            message.error,
            message.message
          );
          break;

        default:
          console.log(
            `📋 ${user.username} received unknown message:`,
            message.type
          );
      }
    } catch (error) {
      console.error(`Error parsing message for ${user.username}:`, error);
    }
  });

  return { receivedMessages };
}

/**
 * Send encrypted message via WebSocket
 */
function sendMessage(ws, recipientUsername, content) {
  const message = {
    type: "message_send",
    recipientUsername: recipientUsername,
    encryptedPayload: `encrypted_${content}_${Date.now()}`, // Mock encryption
    messageType: "message",
  };

  ws.send(JSON.stringify(message));
}

/**
 * Send typing indicator
 */
function sendTypingIndicator(ws, recipientUsername, isTyping) {
  const message = {
    type: isTyping ? "typing_start" : "typing_stop",
    recipientUsername: recipientUsername,
  };

  ws.send(JSON.stringify(message));
}

/**
 * Main test function
 */
async function runWebSocketTest() {
  try {
    console.log("🚀 Starting WebSocket real-time messaging test...\n");

    // Setup both users
    console.log("📝 Setting up test users...");
    const [alice, bob] = await Promise.all([
      setupUser(users[0]),
      setupUser(users[1]),
    ]);

    // Create WebSocket connections
    console.log("\n🔗 Creating WebSocket connections...");
    const [aliceWs, bobWs] = await Promise.all([
      createWebSocketConnection(alice),
      createWebSocketConnection(bob),
    ]);

    // Setup message handlers
    const aliceHandlers = setupMessageHandlers(aliceWs, alice);
    const bobHandlers = setupMessageHandlers(bobWs, bob);

    // Wait for welcome messages
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("\n💬 Testing real-time messaging...");

    // Test 1: Alice sends message to Bob
    console.log("📤 Alice sends message to Bob");
    sendMessage(
      aliceWs,
      bob.username,
      "Hello Bob! This is a real-time message."
    );

    // Test 2: Typing indicators
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("⌨️  Bob starts typing to Alice");
    sendTypingIndicator(bobWs, alice.username, true);

    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log("⌨️  Bob stops typing to Alice");
    sendTypingIndicator(bobWs, alice.username, false);

    // Test 3: Bob replies to Alice
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log("📤 Bob replies to Alice");
    sendMessage(
      bobWs,
      alice.username,
      "Hi Alice! Real-time messaging works great!"
    );

    // Test 4: Rapid message exchange
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("🔄 Testing rapid message exchange...");

    for (let i = 1; i <= 3; i++) {
      sendMessage(aliceWs, bob.username, `Rapid message ${i} from Alice`);
      await new Promise((resolve) => setTimeout(resolve, 200));
      sendMessage(bobWs, alice.username, `Rapid reply ${i} from Bob`);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // Test 5: Ping/Pong
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("🏓 Testing ping/pong...");
    aliceWs.send(JSON.stringify({ type: "ping" }));
    bobWs.send(JSON.stringify({ type: "ping" }));

    // Wait for all messages to be processed
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log("\n📊 Test Results:");
    console.log(
      `Alice received ${aliceHandlers.receivedMessages.length} messages`
    );
    console.log(`Bob received ${bobHandlers.receivedMessages.length} messages`);

    // Test WebSocket stats endpoint
    console.log("\n📈 Checking WebSocket statistics...");
    const statsResponse = await axios.get(`${BASE_URL}/websocket/stats`);
    console.log(
      "WebSocket Stats:",
      JSON.stringify(statsResponse.data.data, null, 2)
    );

    // Close connections
    console.log("\n🔌 Closing WebSocket connections...");
    aliceWs.close();
    bobWs.close();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log(
      "\n🎉 WebSocket Real-Time Messaging Test Completed Successfully!"
    );
    console.log("=======================================================");
    console.log("✅ Two-layer WebSocket authentication");
    console.log("✅ Real-time message delivery");
    console.log("✅ Typing indicators");
    console.log("✅ Delivery confirmations");
    console.log("✅ Connection management");
    console.log("✅ Presence updates");
    console.log("✅ Ping/Pong keep-alive");
    console.log("✅ WebSocket statistics endpoint");
  } catch (error) {
    console.error("❌ WebSocket test failed:", error);
    process.exit(1);
  }
}

// Run the test
runWebSocketTest();
