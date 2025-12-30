const express = require("express");
const db = require("../database/db");
const { requireAccountSession } = require("../middleware/auth");

const router = express.Router();

// Get user's public key by username (requires account session)
router.get("/:username", requireAccountSession, async (req, res) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({
        error: "MISSING_USERNAME",
        message: "Username is required",
      });
    }

    // Find user account and crypto profile
    const result = await db.query(
      `
      SELECT 
        a.username,
        a.created_at as account_created,
        cp.public_key,
        cp.key_uploaded_at,
        cp.key_algorithm
      FROM accounts a
      LEFT JOIN crypto_profiles cp ON a.id = cp.account_id
      WHERE a.username = $1 AND a.account_status = 'active'
    `,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "USER_NOT_FOUND",
        message: "User not found or account inactive",
      });
    }

    const user = result.rows[0];

    // Check if user has crypto profile
    if (!user.public_key) {
      return res.status(404).json({
        error: "NO_CRYPTO_PROFILE",
        message: "User has not set up cryptographic profile",
      });
    }

    // Log user lookup for audit
    await db.logAuditEvent(
      req.accountSession.accountId,
      null,
      "user_lookup",
      "account",
      req.ip,
      req.get("User-Agent"),
      { looked_up_user: username }
    );

    res.json({
      success: true,
      data: {
        username: user.username,
        publicKey: user.public_key,
        keyAlgorithm: user.key_algorithm,
        accountCreated: user.account_created,
        keyUploadedAt: user.key_uploaded_at,
      },
    });
  } catch (error) {
    console.error("User lookup error:", error);
    res.status(500).json({
      error: "USER_LOOKUP_FAILED",
      message: "Failed to retrieve user information",
    });
  }
});

// Search users by username (requires account session)
router.get("/", requireAccountSession, async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q) {
      return res.status(400).json({
        error: "MISSING_QUERY",
        message: "Search query parameter 'q' is required",
      });
    }

    if (q.length < 2) {
      return res.status(400).json({
        error: "QUERY_TOO_SHORT",
        message: "Search query must be at least 2 characters",
      });
    }

    const searchLimit = Math.min(parseInt(limit), 50); // Cap at 50 results

    // Search for users with crypto profiles (only users who can receive messages)
    const result = await db.query(
      `
      SELECT 
        a.username,
        a.created_at as account_created,
        cp.key_uploaded_at,
        cp.key_algorithm
      FROM accounts a
      INNER JOIN crypto_profiles cp ON a.id = cp.account_id
      WHERE a.username ILIKE $1 
        AND a.account_status = 'active'
        AND a.username != $2
      ORDER BY a.username
      LIMIT $3
    `,
      [`%${q}%`, req.accountSession.username, searchLimit]
    );

    // Log search for audit
    await db.logAuditEvent(
      req.accountSession.accountId,
      null,
      "user_search",
      "account",
      req.ip,
      req.get("User-Agent"),
      { search_query: q, results_count: result.rows.length }
    );

    res.json({
      success: true,
      data: {
        users: result.rows.map((user) => ({
          username: user.username,
          keyAlgorithm: user.key_algorithm,
          accountCreated: user.account_created,
          keyUploadedAt: user.key_uploaded_at,
        })),
        query: q,
        totalResults: result.rows.length,
      },
    });
  } catch (error) {
    console.error("User search error:", error);
    res.status(500).json({
      error: "USER_SEARCH_FAILED",
      message: "Failed to search users",
    });
  }
});

module.exports = router;
