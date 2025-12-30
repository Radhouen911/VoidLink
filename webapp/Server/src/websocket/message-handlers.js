const db = require("../database/db");

/**
 * WebSocket Message Handlers
 * Handles different types of real-time messaging events
 */
class MessageHandlers {
  constructor(connectionManager) {
    this.connectionManager = connectionManager;
  }

  /**
   * Handle incoming WebSocket messages
   * @param {WebSocket} ws - WebSocket connection
   * @param {Object} data - Parsed message data
   * @param {Object} userContext - User authentication context
   */
  async handleMessage(ws, data, userContext) {
    try {
      const { type } = data;

      // Route to appropriate handler
      switch (type) {
        case "message_send":
          return await this.handleMessageSend(ws, data, userContext);

        case "typing_start":
          return await this.handleTypingStart(ws, data, userContext);

        case "typing_stop":
          return await this.handleTypingStop(ws, data, userContext);

        case "message_delivered":
          return await this.handleMessageDelivered(ws, data, userContext);

        case "message_read":
          return await this.handleMessageRead(ws, data, userContext);

        case "presence_update":
          return await this.handlePresenceUpdate(ws, data, userContext);

        case "ping":
          return this.handlePing(ws, data, userContext);

        default:
          this.sendError(
            ws,
            "UNKNOWN_MESSAGE_TYPE",
            `Unknown message type: ${type}`
          );
          return false;
      }
    } catch (error) {
      console.error("Message handling error:", error);
      this.sendError(ws, "MESSAGE_HANDLING_ERROR", "Failed to process message");
      return false;
    }
  }

  /**
   * Handle real-time message sending
   * @param {WebSocket} ws - Sender's WebSocket connection
   * @param {Object} data - Message data
   * @param {Object} userContext - Sender's context
   */
  async handleMessageSend(ws, data, userContext) {
    try {
      const {
        recipientUsername,
        encryptedPayload,
        messageType = "message",
      } = data;

      // Find recipient's crypto profile
      const recipientResult = await db.query(
        `
        SELECT cp.id as crypto_profile_id, a.username
        FROM accounts a
        INNER JOIN crypto_profiles cp ON a.id = cp.account_id
        WHERE a.username = $1 AND a.account_status = 'active'
      `,
        [recipientUsername]
      );

      if (recipientResult.rows.length === 0) {
        this.sendError(
          ws,
          "RECIPIENT_NOT_FOUND",
          "Recipient not found or has no crypto profile"
        );
        return false;
      }

      const recipient = recipientResult.rows[0];

      // Prevent sending to self
      if (recipient.crypto_profile_id === userContext.cryptoProfileId) {
        this.sendError(
          ws,
          "CANNOT_SEND_TO_SELF",
          "Cannot send message to yourself"
        );
        return false;
      }

      // Store message in database
      const messageResult = await db.query(
        `
        INSERT INTO messages (sender_crypto_id, recipient_crypto_id, encrypted_payload, message_type) 
        VALUES ($1, $2, $3, $4) 
        RETURNING id, created_at
      `,
        [
          userContext.cryptoProfileId,
          recipient.crypto_profile_id,
          encryptedPayload,
          messageType,
        ]
      );

      const message = messageResult.rows[0];

      // Log message sent event
      await db.logAuditEvent(
        userContext.accountId,
        userContext.cryptoProfileId,
        "message_sent_realtime",
        "messaging",
        null,
        null,
        {
          message_id: message.id,
          recipient_username: recipientUsername,
          message_type: messageType,
        }
      );

      // Prepare real-time message for recipient
      const realtimeMessage = {
        type: "message_received",
        messageId: message.id,
        senderUsername: userContext.username,
        senderCryptoProfileId: userContext.cryptoProfileId,
        encryptedPayload: encryptedPayload,
        messageType: messageType,
        sentAt: message.created_at,
        timestamp: new Date().toISOString(),
      };

      // Send to recipient if online
      const deliveredCount = this.connectionManager.broadcastToUser(
        recipient.crypto_profile_id,
        realtimeMessage
      );

      // Send confirmation to sender
      this.sendSuccess(ws, "message_sent", {
        messageId: message.id,
        recipientUsername: recipientUsername,
        deliveredRealtime: deliveredCount > 0,
        sentAt: message.created_at,
      });

      console.log(
        `📨 Message ${message.id} sent from ${
          userContext.username
        } to ${recipientUsername} (realtime: ${deliveredCount > 0})`
      );

      return true;
    } catch (error) {
      console.error("Message send error:", error);
      this.sendError(ws, "MESSAGE_SEND_FAILED", "Failed to send message");
      return false;
    }
  }

  /**
   * Handle typing start indicator
   * @param {WebSocket} ws - Sender's WebSocket connection
   * @param {Object} data - Typing data
   * @param {Object} userContext - Sender's context
   */
  async handleTypingStart(ws, data, userContext) {
    try {
      const { recipientUsername } = data;

      // Find recipient
      const recipient = await this.findRecipientByUsername(recipientUsername);
      if (!recipient) {
        this.sendError(ws, "RECIPIENT_NOT_FOUND", "Recipient not found");
        return false;
      }

      // Send typing indicator to recipient
      const typingMessage = {
        type: "typing_start",
        senderUsername: userContext.username,
        senderCryptoProfileId: userContext.cryptoProfileId,
        timestamp: new Date().toISOString(),
      };

      this.connectionManager.broadcastToUser(
        recipient.crypto_profile_id,
        typingMessage
      );

      console.log(
        `⌨️  ${userContext.username} started typing to ${recipientUsername}`
      );
      return true;
    } catch (error) {
      console.error("Typing start error:", error);
      return false;
    }
  }

  /**
   * Handle typing stop indicator
   * @param {WebSocket} ws - Sender's WebSocket connection
   * @param {Object} data - Typing data
   * @param {Object} userContext - Sender's context
   */
  async handleTypingStop(ws, data, userContext) {
    try {
      const { recipientUsername } = data;

      // Find recipient
      const recipient = await this.findRecipientByUsername(recipientUsername);
      if (!recipient) {
        return false; // Silently fail for typing stop
      }

      // Send typing stop indicator to recipient
      const typingMessage = {
        type: "typing_stop",
        senderUsername: userContext.username,
        senderCryptoProfileId: userContext.cryptoProfileId,
        timestamp: new Date().toISOString(),
      };

      this.connectionManager.broadcastToUser(
        recipient.crypto_profile_id,
        typingMessage
      );

      console.log(
        `⌨️  ${userContext.username} stopped typing to ${recipientUsername}`
      );
      return true;
    } catch (error) {
      console.error("Typing stop error:", error);
      return false;
    }
  }

  /**
   * Handle message delivered confirmation
   * @param {WebSocket} ws - Recipient's WebSocket connection
   * @param {Object} data - Delivery data
   * @param {Object} userContext - Recipient's context
   */
  async handleMessageDelivered(ws, data, userContext) {
    try {
      const { messageId } = data;

      // Update message delivery status
      const result = await db.query(
        `
        UPDATE messages 
        SET delivered = TRUE, delivered_at = CURRENT_TIMESTAMP 
        WHERE id = $1 AND recipient_crypto_id = $2 AND delivered = FALSE
        RETURNING sender_crypto_id, delivered_at
      `,
        [messageId, userContext.cryptoProfileId]
      );

      if (result.rows.length === 0) {
        this.sendError(
          ws,
          "MESSAGE_NOT_FOUND",
          "Message not found or already delivered"
        );
        return false;
      }

      const message = result.rows[0];

      // Log delivery event
      await db.logAuditEvent(
        userContext.accountId,
        userContext.cryptoProfileId,
        "message_delivered_realtime",
        "messaging",
        null,
        null,
        {
          message_id: messageId,
          delivered_at: message.delivered_at,
        }
      );

      // Notify sender about delivery
      const deliveryNotification = {
        type: "message_delivery_confirmed",
        messageId: messageId,
        deliveredAt: message.delivered_at,
        recipientUsername: userContext.username,
        timestamp: new Date().toISOString(),
      };

      this.connectionManager.broadcastToUser(
        message.sender_crypto_id,
        deliveryNotification
      );

      console.log(
        `✅ Message ${messageId} delivered to ${userContext.username}`
      );
      return true;
    } catch (error) {
      console.error("Message delivered error:", error);
      this.sendError(
        ws,
        "DELIVERY_UPDATE_FAILED",
        "Failed to update delivery status"
      );
      return false;
    }
  }

  /**
   * Handle message read confirmation
   * @param {WebSocket} ws - Reader's WebSocket connection
   * @param {Object} data - Read data
   * @param {Object} userContext - Reader's context
   */
  async handleMessageRead(ws, data, userContext) {
    try {
      const { messageId } = data;

      // For now, we'll just send a read receipt without storing it
      // In a full implementation, you might want to add a read_receipts table

      // Get message details
      const messageResult = await db.query(
        `
        SELECT sender_crypto_id, created_at
        FROM messages 
        WHERE id = $1 AND recipient_crypto_id = $2
      `,
        [messageId, userContext.cryptoProfileId]
      );

      if (messageResult.rows.length === 0) {
        this.sendError(ws, "MESSAGE_NOT_FOUND", "Message not found");
        return false;
      }

      const message = messageResult.rows[0];

      // Notify sender about read receipt
      const readNotification = {
        type: "message_read_confirmed",
        messageId: messageId,
        readAt: new Date().toISOString(),
        readerUsername: userContext.username,
        timestamp: new Date().toISOString(),
      };

      this.connectionManager.broadcastToUser(
        message.sender_crypto_id,
        readNotification
      );

      console.log(`👁️  Message ${messageId} read by ${userContext.username}`);
      return true;
    } catch (error) {
      console.error("Message read error:", error);
      return false;
    }
  }

  /**
   * Handle presence update
   * @param {WebSocket} ws - User's WebSocket connection
   * @param {Object} data - Presence data
   * @param {Object} userContext - User's context
   */
  async handlePresenceUpdate(ws, data, userContext) {
    try {
      const { status } = data;

      // Validate status
      const validStatuses = ["online", "away", "busy", "offline"];
      if (!validStatuses.includes(status)) {
        this.sendError(ws, "INVALID_STATUS", "Invalid presence status");
        return false;
      }

      // Update presence and broadcast to contacts
      await this.connectionManager.broadcastPresenceUpdate(
        userContext.cryptoProfileId,
        status
      );

      console.log(`👤 ${userContext.username} presence updated to ${status}`);
      return true;
    } catch (error) {
      console.error("Presence update error:", error);
      return false;
    }
  }

  /**
   * Handle ping message (keep-alive)
   * @param {WebSocket} ws - WebSocket connection
   * @param {Object} data - Ping data
   * @param {Object} userContext - User context
   */
  handlePing(ws, data, userContext) {
    try {
      // Send pong response
      const pongMessage = {
        type: "pong",
        timestamp: new Date().toISOString(),
        serverTime: Date.now(),
      };

      ws.send(JSON.stringify(pongMessage));
      return true;
    } catch (error) {
      console.error("Ping handling error:", error);
      return false;
    }
  }

  /**
   * Find recipient by username
   * @param {string} username - Recipient username
   * @returns {Object|null} Recipient data or null
   */
  async findRecipientByUsername(username) {
    try {
      const result = await db.query(
        `
        SELECT cp.id as crypto_profile_id, a.username
        FROM accounts a
        INNER JOIN crypto_profiles cp ON a.id = cp.account_id
        WHERE a.username = $1 AND a.account_status = 'active'
      `,
        [username]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error("Find recipient error:", error);
      return null;
    }
  }

  /**
   * Send success response to WebSocket client
   * @param {WebSocket} ws - WebSocket connection
   * @param {string} action - Action that succeeded
   * @param {Object} data - Response data
   */
  sendSuccess(ws, action, data = {}) {
    try {
      const response = {
        type: "success",
        action: action,
        data: data,
        timestamp: new Date().toISOString(),
      };

      ws.send(JSON.stringify(response));
    } catch (error) {
      console.error("Send success error:", error);
    }
  }

  /**
   * Send error response to WebSocket client
   * @param {WebSocket} ws - WebSocket connection
   * @param {string} errorCode - Error code
   * @param {string} message - Error message
   */
  sendError(ws, errorCode, message) {
    try {
      const response = {
        type: "error",
        error: errorCode,
        message: message,
        timestamp: new Date().toISOString(),
      };

      ws.send(JSON.stringify(response));
    } catch (error) {
      console.error("Send error error:", error);
    }
  }
}

module.exports = MessageHandlers;
