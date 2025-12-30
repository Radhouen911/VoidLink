const db = require("../database/db");

/**
 * WebSocket Connection Manager
 * Manages active WebSocket connections and user presence
 */
class ConnectionManager {
  constructor() {
    // Map: cryptoProfileId -> Set of WebSocket connections
    this.connections = new Map();

    // Map: WebSocket -> user context data
    this.userSessions = new Map();

    // Map: cryptoProfileId -> presence status
    this.userPresence = new Map();

    // Connection statistics
    this.stats = {
      totalConnections: 0,
      activeUsers: 0,
      messagesRouted: 0,
    };

    console.log("🔗 WebSocket Connection Manager initialized");
  }

  /**
   * Add a new WebSocket connection
   * @param {WebSocket} ws - WebSocket connection
   * @param {Object} userContext - User authentication context
   */
  addConnection(ws, userContext) {
    try {
      const { cryptoProfileId, username } = userContext;

      // Check if user was previously offline
      const wasOffline =
        !this.connections.has(cryptoProfileId) ||
        this.connections.get(cryptoProfileId).size === 0;

      // Initialize connections set for user if not exists
      if (!this.connections.has(cryptoProfileId)) {
        this.connections.set(cryptoProfileId, new Set());
      }

      // Add connection to user's set
      this.connections.get(cryptoProfileId).add(ws);

      // Store user context for this connection
      this.userSessions.set(ws, userContext);

      // Update presence status
      this.userPresence.set(cryptoProfileId, {
        status: "online",
        lastSeen: new Date().toISOString(),
        username: username,
      });

      // Update statistics
      this.stats.totalConnections++;
      this.stats.activeUsers = this.connections.size;

      // Log connection event
      this.logAuditEvent(
        userContext.accountId,
        userContext.cryptoProfileId,
        "websocket_connected",
        "messaging",
        { username }
      );

      console.log(
        `✅ User ${username} connected (${this.stats.totalConnections} total connections)`
      );

      // Notify contacts about user coming online (only if was previously offline)
      if (wasOffline) {
        this.broadcastPresenceUpdate(cryptoProfileId, "online");
      }

      return true;
    } catch (error) {
      console.error("Error adding WebSocket connection:", error);
      return false;
    }
  }

  /**
   * Remove a WebSocket connection
   * @param {WebSocket} ws - WebSocket connection to remove
   */
  removeConnection(ws) {
    try {
      const userContext = this.userSessions.get(ws);
      if (!userContext) {
        return false;
      }

      const { cryptoProfileId, username } = userContext;

      // Remove connection from user's set
      const userConnections = this.connections.get(cryptoProfileId);
      if (userConnections) {
        userConnections.delete(ws);

        // If no more connections for this user, mark as offline
        if (userConnections.size === 0) {
          this.connections.delete(cryptoProfileId);
          this.userPresence.set(cryptoProfileId, {
            status: "offline",
            lastSeen: new Date().toISOString(),
            username: username,
          });

          // Notify contacts about user going offline
          this.broadcastPresenceUpdate(cryptoProfileId, "offline");
        }
      }

      // Remove user session data
      this.userSessions.delete(ws);

      // Update statistics
      this.stats.totalConnections = Math.max(
        0,
        this.stats.totalConnections - 1
      );
      this.stats.activeUsers = this.connections.size;

      // Log disconnection event
      this.logAuditEvent(
        userContext.accountId,
        userContext.cryptoProfileId,
        "websocket_disconnected",
        "messaging",
        { username }
      );

      console.log(
        `❌ User ${username} disconnected (${this.stats.totalConnections} total connections)`
      );

      // Return whether this was the user's last connection
      return userConnections ? userConnections.size === 0 : true;
    } catch (error) {
      console.error("Error removing WebSocket connection:", error);
      return false;
    }
  }

  /**
   * Get all active connections for a user
   * @param {string} cryptoProfileId - User's crypto profile ID
   * @returns {Set<WebSocket>} Set of WebSocket connections
   */
  getConnectionsForUser(cryptoProfileId) {
    return this.connections.get(cryptoProfileId) || new Set();
  }

  /**
   * Check if user is online
   * @param {string} cryptoProfileId - User's crypto profile ID
   * @returns {boolean} True if user has active connections
   */
  isUserOnline(cryptoProfileId) {
    const connections = this.connections.get(cryptoProfileId);
    return connections && connections.size > 0;
  }

  /**
   * Get user context from WebSocket connection
   * @param {WebSocket} ws - WebSocket connection
   * @returns {Object|null} User context or null
   */
  getUserContext(ws) {
    return this.userSessions.get(ws) || null;
  }

  /**
   * Broadcast message to all connections of a specific user
   * @param {string} cryptoProfileId - Target user's crypto profile ID
   * @param {Object} message - Message to broadcast
   * @returns {number} Number of connections message was sent to
   */
  broadcastToUser(cryptoProfileId, message) {
    const connections = this.getConnectionsForUser(cryptoProfileId);
    let sentCount = 0;

    connections.forEach((ws) => {
      if (ws.readyState === ws.OPEN) {
        try {
          ws.send(JSON.stringify(message));
          sentCount++;
        } catch (error) {
          console.error("Error sending message to WebSocket:", error);
          // Remove broken connection
          this.removeConnection(ws);
        }
      }
    });

    if (sentCount > 0) {
      this.stats.messagesRouted++;
    }

    return sentCount;
  }

  /**
   * Broadcast presence update to user's contacts
   * @param {string} cryptoProfileId - User's crypto profile ID
   * @param {string} status - Presence status (online/offline)
   */
  async broadcastPresenceUpdate(cryptoProfileId, status) {
    try {
      // Get user's contacts
      const contacts = await db.query(
        `
        SELECT contact_crypto_id 
        FROM contacts 
        WHERE owner_crypto_id = $1
        UNION
        SELECT owner_crypto_id 
        FROM contacts 
        WHERE contact_crypto_id = $1
      `,
        [cryptoProfileId]
      );

      const presenceMessage = {
        type: "presence_update",
        cryptoProfileId: cryptoProfileId,
        status: status,
        timestamp: new Date().toISOString(),
      };

      // Broadcast to all contacts who are online
      contacts.rows.forEach((contact) => {
        this.broadcastToUser(
          contact.contact_crypto_id || contact.owner_crypto_id,
          presenceMessage
        );
      });
    } catch (error) {
      console.error("Error broadcasting presence update:", error);
    }
  }

  /**
   * Get connection statistics
   * @returns {Object} Connection statistics
   */
  getStats() {
    return {
      ...this.stats,
      onlineUsers: Array.from(this.userPresence.entries())
        .filter(([_, presence]) => presence.status === "online")
        .map(([cryptoProfileId, presence]) => ({
          cryptoProfileId,
          username: presence.username,
          lastSeen: presence.lastSeen,
        })),
    };
  }

  /**
   * Clean up expired connections and sessions
   */
  async cleanup() {
    try {
      // Remove connections with expired sessions
      for (const [ws, userContext] of this.userSessions.entries()) {
        // Check if sessions are still valid (simplified check)
        const isValid = await this.validateUserSessions(userContext);
        if (!isValid) {
          ws.close(1008, "Session expired");
          this.removeConnection(ws);
        }
      }

      console.log(
        `🧹 WebSocket cleanup completed. Active connections: ${this.stats.totalConnections}`
      );
    } catch (error) {
      console.error("Error during WebSocket cleanup:", error);
    }
  }

  /**
   * Validate user sessions are still active
   * @param {Object} userContext - User context to validate
   * @returns {boolean} True if sessions are valid
   */
  async validateUserSessions(userContext) {
    try {
      const result = await db.query(
        `
        SELECT 1 FROM account_sessions acs
        JOIN crypto_sessions cs ON cs.account_session_id = acs.id
        WHERE acs.id = $1 
          AND cs.id = $2 
          AND acs.expires_at > CURRENT_TIMESTAMP 
          AND cs.expires_at > CURRENT_TIMESTAMP
      `,
        [userContext.accountSessionId, userContext.cryptoSessionId]
      );

      return result.rows.length > 0;
    } catch (error) {
      console.error("Session validation error:", error);
      return false;
    }
  }

  /**
   * Log audit event for WebSocket operations
   * @param {string} accountId - Account ID
   * @param {string} cryptoProfileId - Crypto profile ID
   * @param {string} eventType - Event type
   * @param {string} eventCategory - Event category
   * @param {Object} metadata - Additional metadata
   */
  async logAuditEvent(
    accountId,
    cryptoProfileId,
    eventType,
    eventCategory,
    metadata = {}
  ) {
    try {
      await db.logAuditEvent(
        accountId,
        cryptoProfileId,
        eventType,
        eventCategory,
        null, // IP address not available in WebSocket context
        null, // User agent not available in WebSocket context
        metadata
      );
    } catch (error) {
      console.error("Audit logging error:", error);
    }
  }
}

module.exports = ConnectionManager;
