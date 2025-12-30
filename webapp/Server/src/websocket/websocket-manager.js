const WebSocket = require("ws");
const WebSocketAuth = require("./websocket-auth");
const ConnectionManager = require("./connection-manager");
const MessageHandlers = require("./message-handlers");
const MessageQueueService = require("../services/message-queue-service");

/**
 * WebSocket Manager
 * Main WebSocket server with two-layer authentication and real-time messaging
 */
class WebSocketManager {
  constructor(server) {
    this.server = server;
    this.connectionManager = new ConnectionManager();
    this.messageQueueService = new MessageQueueService(this.connectionManager);
    this.messageHandlers = new MessageHandlers(
      this.connectionManager,
      this.messageQueueService
    );

    // Create WebSocket server
    this.wss = new WebSocket.Server({
      server: this.server,
      path: "/ws",
      verifyClient: this.verifyClient.bind(this),
    });

    this.setupEventHandlers();
    this.startCleanupInterval();

    // Start message queue service
    this.messageQueueService.start();

    console.log(
      "🚀 WebSocket Manager initialized with two-layer authentication and message queue"
    );
  }

  /**
   * Verify client connection (basic validation before upgrade)
   * @param {Object} info - Connection info
   * @returns {boolean} True to allow connection
   */
  verifyClient(info) {
    // Basic validation - detailed auth happens after connection
    const url = new URL(info.req.url, `http://${info.req.headers.host}`);
    const accountToken = url.searchParams.get("account_token");
    const cryptoToken = url.searchParams.get("crypto_token");

    // Require both tokens to be present
    return !!(accountToken && cryptoToken);
  }

  /**
   * Setup WebSocket event handlers
   */
  setupEventHandlers() {
    this.wss.on("connection", async (ws, req) => {
      console.log("🔗 New WebSocket connection attempt");

      try {
        // Authenticate the connection with two-layer validation
        const userContext = await WebSocketAuth.authenticateConnection(ws, req);

        if (!userContext) {
          console.log("❌ WebSocket authentication failed");
          return; // Connection already closed by auth middleware
        }

        // Add connection to manager
        const added = this.connectionManager.addConnection(ws, userContext);
        if (!added) {
          ws.close(1011, "Failed to register connection");
          return;
        }

        // Notify message queue service about user coming online
        await this.messageQueueService.onUserOnline(
          userContext.cryptoProfileId
        );

        // Setup connection event handlers
        this.setupConnectionHandlers(ws, userContext);

        // Send welcome message
        this.sendWelcomeMessage(ws, userContext);

        console.log(`✅ WebSocket authenticated: ${userContext.username}`);
      } catch (error) {
        console.error("WebSocket connection error:", error);
        ws.close(1011, "Connection setup failed");
      }
    });

    this.wss.on("error", (error) => {
      console.error("WebSocket server error:", error);
    });

    console.log("📡 WebSocket event handlers configured");
  }

  /**
   * Setup handlers for individual WebSocket connection
   * @param {WebSocket} ws - WebSocket connection
   * @param {Object} userContext - User authentication context
   */
  setupConnectionHandlers(ws, userContext) {
    // Handle incoming messages
    ws.on("message", async (rawData) => {
      try {
        const data = JSON.parse(rawData.toString());

        // Validate message structure
        if (!WebSocketAuth.validateMessageData(data)) {
          this.messageHandlers.sendError(
            ws,
            "INVALID_MESSAGE_FORMAT",
            "Invalid message format"
          );
          return;
        }

        // Handle the message
        await this.messageHandlers.handleMessage(ws, data, userContext);
      } catch (error) {
        console.error("Message parsing error:", error);
        this.messageHandlers.sendError(
          ws,
          "MESSAGE_PARSE_ERROR",
          "Failed to parse message"
        );
      }
    });

    // Handle connection close
    ws.on("close", (code, reason) => {
      console.log(
        `🔌 WebSocket disconnected: ${userContext.username} (${code}: ${reason})`
      );

      // Remove connection and check if user went offline
      const wasLastConnection = this.connectionManager.removeConnection(ws);

      // If this was the user's last connection, notify message queue service
      if (wasLastConnection) {
        this.messageQueueService
          .onUserOffline(userContext.cryptoProfileId)
          .catch((error) => {
            console.error("Error handling user offline:", error);
          });
      }
    });

    // Handle connection errors
    ws.on("error", (error) => {
      console.error(`WebSocket error for ${userContext.username}:`, error);
      this.connectionManager.removeConnection(ws);
    });

    // Handle pong responses (keep-alive)
    ws.on("pong", () => {
      ws.isAlive = true;
    });
  }

  /**
   * Send welcome message to newly connected client
   * @param {WebSocket} ws - WebSocket connection
   * @param {Object} userContext - User context
   */
  sendWelcomeMessage(ws, userContext) {
    try {
      const welcomeMessage = {
        type: "welcome",
        message: "Connected to VoidLink real-time messaging",
        user: {
          username: userContext.username,
          cryptoProfileId: userContext.cryptoProfileId,
          connectedAt: userContext.connectedAt,
        },
        server: {
          version: "2.0.0-websocket",
          features: [
            "real_time_messaging",
            "typing_indicators",
            "delivery_confirmations",
            "presence_updates",
            "encrypted_payloads",
          ],
        },
        timestamp: new Date().toISOString(),
      };

      ws.send(JSON.stringify(welcomeMessage));
    } catch (error) {
      console.error("Welcome message error:", error);
    }
  }

  /**
   * Start periodic cleanup of expired connections
   */
  startCleanupInterval() {
    // Cleanup every 5 minutes
    setInterval(async () => {
      await this.connectionManager.cleanup();
      this.pingAllConnections();
    }, 5 * 60 * 1000);

    // Ping connections every 30 seconds to detect dead connections
    setInterval(() => {
      this.pingAllConnections();
    }, 30 * 1000);

    console.log("🧹 WebSocket cleanup intervals started");
  }

  /**
   * Ping all connections to detect dead ones
   */
  pingAllConnections() {
    this.wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        console.log("💀 Terminating dead WebSocket connection");
        this.connectionManager.removeConnection(ws);
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();
    });
  }

  /**
   * Get WebSocket server statistics
   * @returns {Object} Server statistics
   */
  getStats() {
    return {
      websocketServer: {
        totalClients: this.wss.clients.size,
        serverUptime: process.uptime(),
      },
      connectionManager: this.connectionManager.getStats(),
    };
  }

  /**
   * Broadcast system message to all connected users
   * @param {Object} message - System message
   * @param {Array} excludeUsers - User IDs to exclude from broadcast
   */
  broadcastSystemMessage(message, excludeUsers = []) {
    const systemMessage = {
      type: "system_message",
      ...message,
      timestamp: new Date().toISOString(),
    };

    this.connectionManager.connections.forEach(
      (connections, cryptoProfileId) => {
        if (!excludeUsers.includes(cryptoProfileId)) {
          this.connectionManager.broadcastToUser(
            cryptoProfileId,
            systemMessage
          );
        }
      }
    );
  }

  /**
   * Gracefully shutdown WebSocket server
   */
  async shutdown() {
    console.log("🛑 Shutting down WebSocket server...");

    // Stop message queue service
    this.messageQueueService.stop();

    // Notify all clients about shutdown
    this.broadcastSystemMessage({
      message: "Server is shutting down. Please reconnect in a moment.",
      level: "warning",
    });

    // Close all connections gracefully
    this.wss.clients.forEach((ws) => {
      ws.close(1001, "Server shutdown");
    });

    // Close WebSocket server
    return new Promise((resolve) => {
      this.wss.close(() => {
        console.log("✅ WebSocket server shutdown complete");
        resolve();
      });
    });
  }
}

module.exports = WebSocketManager;
