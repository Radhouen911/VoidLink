const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../database/db");

const router = express.Router();

// Register new user
router.post("/register", (req, res) => {
  const { username, publicKey, encryptedPrivateKey } = req.body;

  if (!username || !publicKey) {
    return res.status(400).json({ error: "Username and public key required" });
  }

  const stmt = db.prepare(`
    INSERT INTO users (username, public_key, encrypted_private_key) 
    VALUES (?, ?, ?)
  `);

  stmt.run([username, publicKey, encryptedPrivateKey], function (err) {
    if (err) {
      if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
        return res.status(409).json({ error: "Username already exists" });
      }
      return res.status(500).json({ error: "Registration failed" });
    }

    res.status(201).json({
      message: "User registered successfully",
      userId: this.lastID,
    });
  });

  stmt.finalize();
});

// Challenge-response authentication
router.post("/challenge", (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Username required" });
  }

  db.get(
    "SELECT id, public_key FROM users WHERE username = ?",
    [username],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Generate challenge
      const challenge = uuidv4();

      // TODO: Store challenge temporarily for verification

      res.json({
        challenge,
        publicKey: user.public_key,
      });
    }
  );
});

// Verify challenge response
router.post("/verify", (req, res) => {
  const { username, signature, challenge } = req.body;

  // TODO: Implement signature verification
  // For now, just create a session token

  const sessionToken = uuidv4();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  db.get("SELECT id FROM users WHERE username = ?", [username], (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: "Authentication failed" });
    }

    const stmt = db.prepare(`
      INSERT INTO sessions (user_id, session_token, expires_at) 
      VALUES (?, ?, ?)
    `);

    stmt.run([user.id, sessionToken, expiresAt.toISOString()], (err) => {
      if (err) {
        return res.status(500).json({ error: "Session creation failed" });
      }

      res.json({
        sessionToken,
        expiresAt: expiresAt.toISOString(),
      });
    });

    stmt.finalize();
  });
});

module.exports = router;
