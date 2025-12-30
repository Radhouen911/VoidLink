const db = require("../database/db");

// Middleware to validate account session
const requireAccountSession = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "MISSING_ACCOUNT_SESSION",
        message: "Account session token required",
      });
    }

    const sessionToken = authHeader.substring(7);

    // Validate account session
    const sessionResult = await db.query(
      `
      SELECT 
        s.id as session_id,
        s.account_id,
        s.expires_at,
        a.username,
        a.account_status
      FROM account_sessions s
      JOIN accounts a ON s.account_id = a.id
      WHERE s.session_token = $1 AND s.expires_at > CURRENT_TIMESTAMP
    `,
      [sessionToken]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({
        error: "INVALID_ACCOUNT_SESSION",
        message: "Account session is invalid or expired",
      });
    }

    const session = sessionResult.rows[0];

    // Check account status
    if (session.account_status !== "active") {
      return res.status(403).json({
        error: "ACCOUNT_SUSPENDED",
        message: "Account is not active",
      });
    }

    // Update last activity
    await db.query(
      "UPDATE account_sessions SET last_activity = CURRENT_TIMESTAMP WHERE id = $1",
      [session.session_id]
    );

    // Attach session info to request
    req.accountSession = {
      sessionId: session.session_id,
      accountId: session.account_id,
      username: session.username,
      token: sessionToken,
    };

    next();
  } catch (error) {
    console.error("Account session validation error:", error);
    res.status(500).json({
      error: "SESSION_VALIDATION_FAILED",
      message: "Failed to validate account session",
    });
  }
};

// Middleware to validate crypto session (requires account session first)
const requireCryptoSession = async (req, res, next) => {
  try {
    // Ensure account session exists
    if (!req.accountSession) {
      return res.status(401).json({
        error: "MISSING_ACCOUNT_SESSION",
        message: "Account session required for crypto operations",
      });
    }

    const cryptoToken = req.headers["x-crypto-session"];

    if (!cryptoToken) {
      return res.status(401).json({
        error: "MISSING_CRYPTO_SESSION",
        message: "Crypto session token required",
      });
    }

    // Validate crypto session
    const cryptoResult = await db.query(
      `
      SELECT 
        cs.id as crypto_session_id,
        cs.crypto_profile_id,
        cs.expires_at,
        cp.public_key
      FROM crypto_sessions cs
      JOIN crypto_profiles cp ON cs.crypto_profile_id = cp.id
      JOIN account_sessions acs ON cs.account_session_id = acs.id
      WHERE cs.crypto_token = $1 
        AND cs.expires_at > CURRENT_TIMESTAMP
        AND acs.account_id = $2
    `,
      [cryptoToken, req.accountSession.accountId]
    );

    if (cryptoResult.rows.length === 0) {
      return res.status(401).json({
        error: "INVALID_CRYPTO_SESSION",
        message: "Crypto session is invalid, expired, or not linked to account",
      });
    }

    const cryptoSession = cryptoResult.rows[0];

    // Update crypto session activity
    await db.query(
      "UPDATE crypto_sessions SET last_activity = CURRENT_TIMESTAMP WHERE id = $1",
      [cryptoSession.crypto_session_id]
    );

    // Attach crypto session info to request
    req.cryptoSession = {
      sessionId: cryptoSession.crypto_session_id,
      cryptoProfileId: cryptoSession.crypto_profile_id,
      publicKey: cryptoSession.public_key,
      token: cryptoToken,
    };

    next();
  } catch (error) {
    console.error("Crypto session validation error:", error);
    res.status(500).json({
      error: "CRYPTO_SESSION_VALIDATION_FAILED",
      message: "Failed to validate crypto session",
    });
  }
};

// Combined middleware for operations requiring both sessions
const requireBothSessions = [requireAccountSession, requireCryptoSession];

// Middleware to get crypto profile for account (if exists)
const attachCryptoProfile = async (req, res, next) => {
  try {
    if (!req.accountSession) {
      return next(); // Skip if no account session
    }

    const cryptoResult = await db.query(
      `
      SELECT 
        id as crypto_profile_id,
        public_key,
        cloud_backup_enabled,
        key_uploaded_at
      FROM crypto_profiles 
      WHERE account_id = $1
    `,
      [req.accountSession.accountId]
    );

    if (cryptoResult.rows.length > 0) {
      req.cryptoProfile = cryptoResult.rows[0];
    }

    next();
  } catch (error) {
    console.error("Crypto profile attachment error:", error);
    next(); // Continue without crypto profile
  }
};

module.exports = {
  requireAccountSession,
  requireCryptoSession,
  requireBothSessions,
  attachCryptoProfile,
};
