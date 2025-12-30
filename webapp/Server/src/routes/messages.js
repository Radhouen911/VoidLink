const express = require("express");
const db = require("../database/db");
const { requireBothSessions } = require("../middleware/auth");

const router = express.Router();

// Send encrypted message (requires both account and crypto sessions)
router.post("/send", requireBothSessions, async (req, res) => {
  try {
    const {
      recipientUsername,
      encryptedPayload,
      messageType = "message",
    } = req.body;

    if (!recipientUsername || !encryptedPayload) {
      return res.status(400).json({
        error: "MISSING_FIELDS",
        message: "Recipient username and encrypted payload are required",
      });
    }

    // Validate message type
    const validTypes = ["message", "file", "system"];
    if (!validTypes.includes(messageType)) {
      return res.status(400).json({
        error: "INVALID_MESSAGE_TYPE",
        message: "Message type must be one of: message, file, system",
      });
    }

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
      return res.status(404).json({
        error: "RECIPIENT_NOT_FOUND",
        message: "Recipient not found or has no crypto profile",
      });
    }

    const recipient = recipientResult.rows[0];

    // Prevent sending to self
    if (recipient.crypto_profile_id === req.cryptoSession.cryptoProfileId) {
      return res.status(400).json({
        error: "CANNOT_SEND_TO_SELF",
        message: "Cannot send message to yourself",
      });
    }

    // Store encrypted message (server treats as opaque blob)
    const messageResult = await db.query(
      `
      INSERT INTO messages (sender_crypto_id, recipient_crypto_id, encrypted_payload, message_type) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id, created_at
    `,
      [
        req.cryptoSession.cryptoProfileId,
        recipient.crypto_profile_id,
        encryptedPayload,
        messageType,
      ]
    );

    const message = messageResult.rows[0];

    // Log message sent event
    await db.logAuditEvent(
      req.accountSession.accountId,
      req.cryptoSession.cryptoProfileId,
      "message_sent",
      "messaging",
      req.ip,
      req.get("User-Agent"),
      {
        message_id: message.id,
        recipient_username: recipientUsername,
        message_type: messageType,
      }
    );

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: {
        messageId: message.id,
        sentAt: message.created_at,
        recipient: recipientUsername,
        messageType,
      },
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({
      error: "MESSAGE_SEND_FAILED",
      message: "Failed to send message",
    });
  }
});

// Get conversation with specific user (requires both sessions)
router.get("/conversation/:username", requireBothSessions, async (req, res) => {
  try {
    const { username } = req.params;
    const { since, limit = 50, offset = 0 } = req.query;

    // Find conversation partner's crypto profile
    const partnerResult = await db.query(
      `
      SELECT cp.id as crypto_profile_id, a.username
      FROM accounts a
      INNER JOIN crypto_profiles cp ON a.id = cp.account_id
      WHERE a.username = $1 AND a.account_status = 'active'
    `,
      [username]
    );

    if (partnerResult.rows.length === 0) {
      return res.status(404).json({
        error: "USER_NOT_FOUND",
        message: "Conversation partner not found",
      });
    }

    const partner = partnerResult.rows[0];
    const messageLimit = Math.min(parseInt(limit), 100); // Cap at 100 messages

    // Build query with optional timestamp filter
    let query = `
      SELECT 
        m.id,
        m.encrypted_payload,
        m.message_type,
        m.delivered,
        m.created_at,
        CASE 
          WHEN m.sender_crypto_id = $1 THEN 'sent'
          ELSE 'received'
        END as direction,
        CASE 
          WHEN m.sender_crypto_id = $1 THEN $3
          ELSE $4
        END as partner_username
      FROM messages m
      WHERE (
        (m.sender_crypto_id = $1 AND m.recipient_crypto_id = $2 AND m.deleted_by_sender = FALSE) OR
        (m.sender_crypto_id = $2 AND m.recipient_crypto_id = $1 AND m.deleted_by_recipient = FALSE)
      )
    `;

    const queryParams = [
      req.cryptoSession.cryptoProfileId,
      partner.crypto_profile_id,
      req.accountSession.username,
      username,
    ];

    if (since) {
      query += ` AND m.created_at > $${queryParams.length + 1}`;
      queryParams.push(new Date(since));
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${
      queryParams.length + 1
    } OFFSET $${queryParams.length + 2}`;
    queryParams.push(messageLimit, parseInt(offset));

    const result = await db.query(query, queryParams);

    // Log conversation access
    await db.logAuditEvent(
      req.accountSession.accountId,
      req.cryptoSession.cryptoProfileId,
      "conversation_accessed",
      "messaging",
      req.ip,
      req.get("User-Agent"),
      {
        partner_username: username,
        messages_count: result.rows.length,
        since_timestamp: since || null,
      }
    );

    res.json({
      success: true,
      data: {
        conversation: result.rows.map((msg) => ({
          messageId: msg.id,
          encryptedPayload: msg.encrypted_payload, // Opaque to server
          messageType: msg.message_type,
          direction: msg.direction,
          delivered: msg.delivered,
          createdAt: msg.created_at,
        })),
        partner: username,
        totalMessages: result.rows.length,
        hasMore: result.rows.length === messageLimit,
      },
    });
  } catch (error) {
    console.error("Get conversation error:", error);
    res.status(500).json({
      error: "CONVERSATION_FETCH_FAILED",
      message: "Failed to retrieve conversation",
    });
  }
});

// Get user's inbox (requires both sessions)
router.get("/inbox", requireBothSessions, async (req, res) => {
  try {
    const { limit = 50, offset = 0, undelivered_only = false } = req.query;

    const messageLimit = Math.min(parseInt(limit), 100);

    let query = `
      SELECT 
        m.id,
        m.encrypted_payload,
        m.message_type,
        m.delivered,
        m.created_at,
        sender_account.username as sender_username
      FROM messages m
      INNER JOIN crypto_profiles sender_cp ON m.sender_crypto_id = sender_cp.id
      INNER JOIN accounts sender_account ON sender_cp.account_id = sender_account.id
      WHERE m.recipient_crypto_id = $1 AND m.deleted_by_recipient = FALSE
    `;

    const queryParams = [req.cryptoSession.cryptoProfileId];

    if (undelivered_only === "true") {
      query += ` AND m.delivered = FALSE`;
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${
      queryParams.length + 1
    } OFFSET $${queryParams.length + 2}`;
    queryParams.push(messageLimit, parseInt(offset));

    const result = await db.query(query, queryParams);

    // Log inbox access
    await db.logAuditEvent(
      req.accountSession.accountId,
      req.cryptoSession.cryptoProfileId,
      "inbox_accessed",
      "messaging",
      req.ip,
      req.get("User-Agent"),
      {
        messages_count: result.rows.length,
        undelivered_only: undelivered_only === "true",
      }
    );

    res.json({
      success: true,
      data: {
        messages: result.rows.map((msg) => ({
          messageId: msg.id,
          encryptedPayload: msg.encrypted_payload, // Opaque to server
          messageType: msg.message_type,
          delivered: msg.delivered,
          senderUsername: msg.sender_username,
          createdAt: msg.created_at,
        })),
        totalMessages: result.rows.length,
        hasMore: result.rows.length === messageLimit,
      },
    });
  } catch (error) {
    console.error("Get inbox error:", error);
    res.status(500).json({
      error: "INBOX_FETCH_FAILED",
      message: "Failed to retrieve inbox",
    });
  }
});

// Mark message as delivered (requires both sessions)
router.patch("/:messageId/delivered", requireBothSessions, async (req, res) => {
  try {
    const { messageId } = req.params;

    if (!messageId) {
      return res.status(400).json({
        error: "MISSING_MESSAGE_ID",
        message: "Message ID is required",
      });
    }

    // Update message delivery status (only if user is recipient)
    const result = await db.query(
      `
      UPDATE messages 
      SET delivered = TRUE, delivered_at = CURRENT_TIMESTAMP 
      WHERE id = $1 AND recipient_crypto_id = $2 AND delivered = FALSE
      RETURNING id, delivered_at
    `,
      [messageId, req.cryptoSession.cryptoProfileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "MESSAGE_NOT_FOUND",
        message: "Message not found, already delivered, or not authorized",
      });
    }

    const message = result.rows[0];

    // Log delivery confirmation
    await db.logAuditEvent(
      req.accountSession.accountId,
      req.cryptoSession.cryptoProfileId,
      "message_delivered",
      "messaging",
      req.ip,
      req.get("User-Agent"),
      {
        message_id: messageId,
        delivered_at: message.delivered_at,
      }
    );

    res.json({
      success: true,
      message: "Message marked as delivered",
      data: {
        messageId: message.id,
        deliveredAt: message.delivered_at,
      },
    });
  } catch (error) {
    console.error("Mark delivered error:", error);
    res.status(500).json({
      error: "DELIVERY_UPDATE_FAILED",
      message: "Failed to mark message as delivered",
    });
  }
});

// Soft delete message (requires both sessions)
router.delete("/:messageId", requireBothSessions, async (req, res) => {
  try {
    const { messageId } = req.params;

    if (!messageId) {
      return res.status(400).json({
        error: "MISSING_MESSAGE_ID",
        message: "Message ID is required",
      });
    }

    // Check if user is sender or recipient
    const messageResult = await db.query(
      `
      SELECT 
        id,
        sender_crypto_id,
        recipient_crypto_id,
        deleted_by_sender,
        deleted_by_recipient
      FROM messages 
      WHERE id = $1 AND (sender_crypto_id = $2 OR recipient_crypto_id = $2)
    `,
      [messageId, req.cryptoSession.cryptoProfileId]
    );

    if (messageResult.rows.length === 0) {
      return res.status(404).json({
        error: "MESSAGE_NOT_FOUND",
        message: "Message not found or not authorized",
      });
    }

    const message = messageResult.rows[0];
    const isSender =
      message.sender_crypto_id === req.cryptoSession.cryptoProfileId;
    const isRecipient =
      message.recipient_crypto_id === req.cryptoSession.cryptoProfileId;

    // Determine which deletion flag to set
    let updateQuery;
    let deleteType;

    if (isSender && !message.deleted_by_sender) {
      updateQuery =
        "UPDATE messages SET deleted_by_sender = TRUE WHERE id = $1";
      deleteType = "sender";
    } else if (isRecipient && !message.deleted_by_recipient) {
      updateQuery =
        "UPDATE messages SET deleted_by_recipient = TRUE WHERE id = $1";
      deleteType = "recipient";
    } else {
      return res.status(409).json({
        error: "ALREADY_DELETED",
        message: "Message already deleted by this user",
      });
    }

    await db.query(updateQuery, [messageId]);

    // Log deletion event
    await db.logAuditEvent(
      req.accountSession.accountId,
      req.cryptoSession.cryptoProfileId,
      "message_deleted",
      "messaging",
      req.ip,
      req.get("User-Agent"),
      {
        message_id: messageId,
        delete_type: deleteType,
      }
    );

    res.json({
      success: true,
      message: "Message deleted successfully",
      data: {
        messageId,
        deletedBy: deleteType,
      },
    });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({
      error: "MESSAGE_DELETE_FAILED",
      message: "Failed to delete message",
    });
  }
});

module.exports = router;
