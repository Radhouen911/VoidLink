const db = require("../database/db");
const url = require("url");

/**
 * WebSocket Authentication Middleware
 * Validates both account and crypto sessions for WebSocket connections
 */
class WebSocketAuth {
  /**
   * Authenticate WebSocket connection with two-layer validation
   * @param {WebSocket} ws - WebSocket connection
   * @param {IncomingMessage} req - HTTP request object
   * @returns {Object|null} User context or null if authentication fails
   */
  static async authenticateConnection(ws, req) {
    try {
      // Parse query parameters from WebSocket URL
      const parsedUrl = url.parse(req.url, true);
      const { account_token, crypto_token } = parsedUrl.query;

      if (!account_token || !crypto_token) {
        ws.close(1008, "Missing authentication tokens");
        return null;
      }

      // Validate account session
      const accountSession = await this.validateAccountSession(account_token);
      if (!accountSession) {
        ws.close(1008, "Invalid account session");
        return null;
      }

      // Validate crypto session
      const cryptoSession = await this.validateCryptoSession(
        crypto_token,
        accountSession.accountId
      );
      if (!cryptoSession) {
        ws.close(1008, "Invalid crypto session");
        return null;
      }

      // Update session activity
      await this.updateSessionActivity(
        accountSession.sessionId,
        cryptoSession.sessionId
      );

      // Return user context for WebSocket operations
      return {
        accountId: accountSession.accountId,
        username: accountSession.username,
        cryptoProfileId: cryptoSession.cryptoProfileId,
        publicKey: cryptoSession.publicKey,
        accountSessionId: accountSession.sessionId,
        cryptoSessionId: cryptoSession.sessionId,
        connectedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("WebSocket authentication error:", error);
      ws.close(1011, "Authentication error");
      return null;
    }
  }

  /**
   * Validate account session token
   * @param {string} sessionToken - Account session token
   * @returns {Object|null} Account session data or null
   */
  static async validateAccountSession(sessionToken) {
    try {
      const result = await db.query(
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

      if (result.rows.length === 0) {
        return null;
      }

      const session = result.rows[0];

      // Check account status
      if (session.account_status !== "active") {
        return null;
      }

      return {
        sessionId: session.session_id,
        accountId: session.account_id,
        username: session.username,
        expiresAt: session.expires_at,
      };
    } catch (error) {
      console.error("Account session validation error:", error);
      return null;
    }
  }

  /**
   * Validate crypto session token
   * @param {string} cryptoToken - Crypto session token
   * @param {string} accountId - Account ID to verify ownership
   * @returns {Object|null} Crypto session data or null
   */
  static async validateCryptoSession(cryptoToken, accountId) {
    try {
      const result = await db.query(
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
        [cryptoToken, accountId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const session = result.rows[0];

      return {
        sessionId: session.crypto_session_id,
        cryptoProfileId: session.crypto_profile_id,
        publicKey: session.public_key,
        expiresAt: session.expires_at,
      };
    } catch (error) {
      console.error("Crypto session validation error:", error);
      return null;
    }
  }

  /**
   * Update session activity timestamps
   * @param {string} accountSessionId - Account session ID
   * @param {string} cryptoSessionId - Crypto session ID
   */
  static async updateSessionActivity(accountSessionId, cryptoSessionId) {
    try {
      // Update both session activities
      await Promise.all([
        db.query(
          "UPDATE account_sessions SET last_activity = CURRENT_TIMESTAMP WHERE id = $1",
          [accountSessionId]
        ),
        db.query(
          "UPDATE crypto_sessions SET last_activity = CURRENT_TIMESTAMP WHERE id = $1",
          [cryptoSessionId]
        ),
      ]);
    } catch (error) {
      console.error("Session activity update error:", error);
    }
  }

  /**
   * Validate message data structure
   * @param {Object} data - Message data from client
   * @returns {boolean} True if valid, false otherwise
   */
  static validateMessageData(data) {
    if (!data || typeof data !== "object") {
      return false;
    }

    // Check required fields based on message type
    switch (data.type) {
      case "message_send":
        return !!(data.recipientUsername && data.encryptedPayload);

      case "typing_start":
      case "typing_stop":
        return !!data.recipientUsername;

      case "message_delivered":
      case "message_read":
        return !!data.messageId;

      case "presence_update":
        return typeof data.status === "string";

      case "ping":
        return !!data.type; // Just validate that type exists

      case "pong":
        return !!data.type; // Just validate that type exists

      default:
        return false;
    }
  }
}

module.exports = WebSocketAuth;
