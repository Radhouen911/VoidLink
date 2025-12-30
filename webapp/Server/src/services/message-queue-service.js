const db = require("../database/db");

/**
 * Message Queue Service
 * Handles offline message delivery and queue management
 */
class MessageQueueService {
  constructor(connectionManager) {
    this.connectionManager = connectionManager;
    this.processingInterval = null;
    this.cleanupInterval = null;
    this.isProcessing = false;

    console.log("📬 Message Queue Service initialized");
  }

  /**
   * Start the message queue processing
   */
  start() {
    // Process queue every 10 seconds
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 10 * 1000);

    // Cleanup expired data every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);

    console.log("🚀 Message Queue Service started");
  }

  /**
   * Stop the message queue processing
   */
  stop() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    console.log("🛑 Message Queue Service stopped");
  }

  /**
   * Queue a message for offline delivery
   * @param {string} messageId - Message ID
   * @param {string} recipientCryptoId - Recipient's crypto profile ID
   * @param {number} priority - Message priority (higher = more important)
   */
  async queueMessage(messageId, recipientCryptoId, priority = 0) {
    try {
      // Check if recipient is online
      const isOnline = this.connectionManager.isUserOnline(recipientCryptoId);

      if (isOnline) {
        console.log(
          `📨 Recipient ${recipientCryptoId} is online, no queuing needed`
        );
        return { queued: false, reason: "recipient_online" };
      }

      // Queue the message
      const queueEntry = await db.queueMessage(
        messageId,
        recipientCryptoId,
        priority
      );

      // Update user presence to offline if not already tracked
      await db.updateUserPresence(recipientCryptoId, "offline", 0);

      console.log(
        `📬 Message ${messageId} queued for offline user ${recipientCryptoId}`
      );

      return {
        queued: true,
        queueId: queueEntry.id,
        queuedAt: queueEntry.created_at,
      };
    } catch (error) {
      console.error("Error queuing message:", error);
      throw error;
    }
  }

  /**
   * Process the message queue for online users
   */
  async processQueue() {
    if (this.isProcessing) {
      return; // Prevent concurrent processing
    }

    this.isProcessing = true;

    try {
      // Get users with queued messages who are now online
      const usersWithQueue = await db.processMessageQueue();

      if (usersWithQueue.length === 0) {
        return;
      }

      console.log(
        `📬 Processing queue for ${usersWithQueue.length} online users`
      );

      for (const user of usersWithQueue) {
        await this.deliverQueuedMessages(user.recipient_crypto_id);
      }
    } catch (error) {
      console.error("Error processing message queue:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Deliver all queued messages for a specific user
   * @param {string} recipientCryptoId - Recipient's crypto profile ID
   */
  async deliverQueuedMessages(recipientCryptoId) {
    try {
      // Get queued messages for this user
      const queuedMessages = await db.getQueuedMessages(recipientCryptoId);

      if (queuedMessages.length === 0) {
        return;
      }

      console.log(
        `📨 Delivering ${queuedMessages.length} queued messages to ${recipientCryptoId}`
      );

      // Get sender usernames for the messages
      const messageDetails = await this.enrichMessagesWithSenderInfo(
        queuedMessages
      );

      let deliveredCount = 0;
      let failedCount = 0;

      for (const message of messageDetails) {
        try {
          // Prepare real-time message
          const realtimeMessage = {
            type: "message_received",
            messageId: message.message_id,
            senderUsername: message.sender_username,
            senderCryptoProfileId: message.sender_crypto_id,
            encryptedPayload: message.encrypted_payload,
            messageType: message.message_type,
            sentAt: message.created_at,
            fromQueue: true, // Indicate this was queued
            priority: message.priority,
            timestamp: new Date().toISOString(),
          };

          // Attempt delivery via WebSocket
          const delivered = this.connectionManager.broadcastToUser(
            recipientCryptoId,
            realtimeMessage
          );

          if (delivered > 0) {
            // Mark as delivered in database
            await db.markMessageDelivered(message.message_id, message.queue_id);
            deliveredCount++;

            console.log(
              `✅ Delivered queued message ${message.message_id} to ${recipientCryptoId}`
            );
          } else {
            // User went offline during processing
            await db.markMessageFailed(
              message.message_id,
              message.queue_id,
              "User went offline during delivery"
            );
            failedCount++;
          }
        } catch (error) {
          console.error(
            `❌ Failed to deliver message ${message.message_id}:`,
            error
          );
          await db.markMessageFailed(
            message.message_id,
            message.queue_id,
            error.message
          );
          failedCount++;
        }
      }

      console.log(
        `📊 Queue delivery complete for ${recipientCryptoId}: ${deliveredCount} delivered, ${failedCount} failed`
      );
    } catch (error) {
      console.error(
        `Error delivering queued messages for ${recipientCryptoId}:`,
        error
      );
    }
  }

  /**
   * Enrich messages with sender information
   * @param {Array} queuedMessages - Array of queued messages
   * @returns {Array} Messages with sender usernames
   */
  async enrichMessagesWithSenderInfo(queuedMessages) {
    try {
      if (queuedMessages.length === 0) {
        return [];
      }

      // Get sender usernames
      const senderIds = [
        ...new Set(queuedMessages.map((m) => m.sender_crypto_id)),
      ];
      const senderResult = await db.query(
        `
        SELECT cp.id as crypto_profile_id, a.username
        FROM crypto_profiles cp
        JOIN accounts a ON cp.account_id = a.id
        WHERE cp.id = ANY($1)
      `,
        [senderIds]
      );

      const senderMap = new Map();
      senderResult.rows.forEach((sender) => {
        senderMap.set(sender.crypto_profile_id, sender.username);
      });

      // Add sender usernames to messages
      return queuedMessages.map((message) => ({
        ...message,
        sender_username: senderMap.get(message.sender_crypto_id) || "Unknown",
        queue_id: message.id, // Add queue ID for tracking
      }));
    } catch (error) {
      console.error("Error enriching messages with sender info:", error);
      return queuedMessages.map((message) => ({
        ...message,
        sender_username: "Unknown",
        queue_id: message.id,
      }));
    }
  }

  /**
   * Handle user coming online - trigger queue processing
   * @param {string} cryptoProfileId - User's crypto profile ID
   */
  async onUserOnline(cryptoProfileId) {
    try {
      console.log(`👤 User ${cryptoProfileId} came online, checking queue...`);

      // Update presence status
      await db.updateUserPresence(cryptoProfileId, "online", 1);

      // Deliver any queued messages immediately
      await this.deliverQueuedMessages(cryptoProfileId);
    } catch (error) {
      console.error(
        `Error handling user online for ${cryptoProfileId}:`,
        error
      );
    }
  }

  /**
   * Handle user going offline
   * @param {string} cryptoProfileId - User's crypto profile ID
   */
  async onUserOffline(cryptoProfileId) {
    try {
      console.log(`👤 User ${cryptoProfileId} went offline`);

      // Update presence status
      await db.updateUserPresence(cryptoProfileId, "offline", -1);
    } catch (error) {
      console.error(
        `Error handling user offline for ${cryptoProfileId}:`,
        error
      );
    }
  }

  /**
   * Get queue statistics
   * @returns {Object} Queue statistics
   */
  async getQueueStats() {
    try {
      const result = await db.query(`
        SELECT 
          queue_status,
          COUNT(*) as count,
          AVG(retry_count) as avg_retries
        FROM message_queue 
        GROUP BY queue_status
      `);

      const stats = {
        total: 0,
        byStatus: {},
      };

      result.rows.forEach((row) => {
        stats.byStatus[row.queue_status] = {
          count: parseInt(row.count),
          avgRetries: parseFloat(row.avg_retries) || 0,
        };
        stats.total += parseInt(row.count);
      });

      return stats;
    } catch (error) {
      console.error("Error getting queue stats:", error);
      return { total: 0, byStatus: {} };
    }
  }

  /**
   * Cleanup expired messages and failed queue entries
   */
  async cleanup() {
    try {
      const results = await db.cleanupExpiredData();

      if (results.expiredMessages > 0) {
        console.log(
          `🧹 Cleaned up ${results.expiredMessages} expired messages and queue entries`
        );
      }

      return results;
    } catch (error) {
      console.error("Error during queue cleanup:", error);
      return null;
    }
  }

  /**
   * Force process queue for a specific user (manual trigger)
   * @param {string} cryptoProfileId - User's crypto profile ID
   */
  async forceProcessUser(cryptoProfileId) {
    try {
      console.log(`🔄 Force processing queue for user ${cryptoProfileId}`);
      await this.deliverQueuedMessages(cryptoProfileId);
    } catch (error) {
      console.error(`Error force processing user ${cryptoProfileId}:`, error);
      throw error;
    }
  }

  /**
   * Check if the service is running
   * @returns {boolean} True if service is running
   */
  isRunning() {
    return this.processingInterval !== null && this.cleanupInterval !== null;
  }

  /**
   * Get comprehensive service statistics
   * @returns {Object} Service statistics
   */
  async getStats() {
    try {
      const queueStats = await this.getQueueStats();
      const onlineUsers = await db.getOnlineUsers();

      return {
        isRunning: this.isRunning(),
        queuedMessages: queueStats.byStatus.queued?.count || 0,
        processingMessages: queueStats.byStatus.processing?.count || 0,
        deliveredMessages: queueStats.byStatus.delivered?.count || 0,
        failedMessages: queueStats.byStatus.failed?.count || 0,
        totalMessages: queueStats.total,
        onlineUsers: onlineUsers.length,
        onlineUsersList: onlineUsers.map((u) => ({
          username: u.username,
          cryptoProfileId: u.crypto_profile_id,
          connectionCount: u.connection_count,
          lastSeen: u.last_seen,
        })),
      };
    } catch (error) {
      console.error("Error getting service stats:", error);
      return {
        isRunning: this.isRunning(),
        queuedMessages: 0,
        processingMessages: 0,
        deliveredMessages: 0,
        failedMessages: 0,
        totalMessages: 0,
        onlineUsers: 0,
        onlineUsersList: [],
      };
    }
  }
}

module.exports = MessageQueueService;
