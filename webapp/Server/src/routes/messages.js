const express = require("express");
const db = require("../database/db");

const router = express.Router();

// Send encrypted message
router.post("/send", (req, res) => {
  const {
    senderId,
    recipientUsername,
    encryptedContent,
    encryptedSessionKey,
    messageType = "message",
  } = req.body;

  if (!senderId || !recipientUsername || !encryptedContent) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Get recipient ID
  db.get(
    "SELECT id FROM users WHERE username = ?",
    [recipientUsername],
    (err, recipient) => {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }

      if (!recipient) {
        return res.status(404).json({ error: "Recipient not found" });
      }

      const stmt = db.prepare(`
      INSERT INTO messages (sender_id, recipient_id, encrypted_content, encrypted_session_key, message_type) 
      VALUES (?, ?, ?, ?, ?)
    `);

      stmt.run(
        [
          senderId,
          recipient.id,
          encryptedContent,
          encryptedSessionKey,
          messageType,
        ],
        function (err) {
          if (err) {
            return res.status(500).json({ error: "Failed to send message" });
          }

          res.status(201).json({
            messageId: this.lastID,
            message: "Message sent successfully",
          });
        }
      );

      stmt.finalize();
    }
  );
});

// Get messages for user
router.get("/inbox/:userId", (req, res) => {
  const { userId } = req.params;
  const { limit = 50, offset = 0 } = req.query;

  db.all(
    `
    SELECT 
      m.id,
      m.encrypted_content,
      m.encrypted_session_key,
      m.message_type,
      m.delivered,
      m.created_at,
      u.username as sender_username
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.recipient_id = ?
    ORDER BY m.created_at DESC
    LIMIT ? OFFSET ?
  `,
    [userId, limit, offset],
    (err, messages) => {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }

      res.json({ messages });
    }
  );
});

// Mark message as delivered
router.patch("/:messageId/delivered", (req, res) => {
  const { messageId } = req.params;

  db.run(
    "UPDATE messages SET delivered = TRUE WHERE id = ?",
    [messageId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: "Message not found" });
      }

      res.json({ message: "Message marked as delivered" });
    }
  );
});

module.exports = router;
