const express = require("express");
const db = require("../database/db");

const router = express.Router();

// Get user's public key
router.get("/:username", (req, res) => {
  const { username } = req.params;

  db.get(
    "SELECT username, public_key, created_at FROM users WHERE username = ?",
    [username],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        username: user.username,
        publicKey: user.public_key,
        createdAt: user.created_at,
      });
    }
  );
});

// Search users
router.get("/", (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: "Search query required" });
  }

  db.all(
    "SELECT username, created_at FROM users WHERE username LIKE ? LIMIT 10",
    [`%${q}%`],
    (err, users) => {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }

      res.json({ users });
    }
  );
});

module.exports = router;
