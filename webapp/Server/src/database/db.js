const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "voidlink",
  user: process.env.DB_USER || "voidlink",
  password: process.env.DB_PASSWORD || "voidlink_secure_pass",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Handle pool errors
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

const db = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),

  // Helper functions for account operations
  async findAccountByUsername(username) {
    const result = await this.query(
      "SELECT id, username, password_hash, account_status, created_at FROM accounts WHERE username = $1",
      [username]
    );
    return result.rows[0] || null;
  },

  async createAccount(username, passwordHash) {
    const result = await this.query(
      "INSERT INTO accounts (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at",
      [username, passwordHash]
    );
    return result.rows[0];
  },

  async createAccountSession(
    accountId,
    sessionToken,
    expiresAt,
    ipAddress,
    userAgent
  ) {
    const result = await this.query(
      `
      INSERT INTO account_sessions (account_id, session_token, expires_at, ip_address, user_agent) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING id, session_token, expires_at
    `,
      [accountId, sessionToken, expiresAt, ipAddress, userAgent]
    );
    return result.rows[0];
  },

  // Helper functions for crypto profile operations
  async findCryptoProfileByAccount(accountId) {
    const result = await this.query(
      "SELECT id, public_key, cloud_backup_enabled, encrypted_private_key_backup FROM crypto_profiles WHERE account_id = $1",
      [accountId]
    );
    return result.rows[0] || null;
  },

  async createCryptoProfile(accountId, publicKey) {
    const result = await this.query(
      "INSERT INTO crypto_profiles (account_id, public_key) VALUES ($1, $2) RETURNING id, key_uploaded_at",
      [accountId, publicKey]
    );
    return result.rows[0];
  },

  async createCryptoSession(
    accountSessionId,
    cryptoProfileId,
    cryptoToken,
    expiresAt
  ) {
    const result = await this.query(
      `
      INSERT INTO crypto_sessions (account_session_id, crypto_profile_id, crypto_token, expires_at) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id, crypto_token, expires_at
    `,
      [accountSessionId, cryptoProfileId, cryptoToken, expiresAt]
    );
    return result.rows[0];
  },

  // Helper function for challenge operations with crypto profile binding
  async createChallenge(
    accountSessionId,
    cryptoProfileId,
    challengeToken,
    expiresAt
  ) {
    const result = await this.query(
      `
      INSERT INTO auth_challenges (account_session_id, crypto_profile_id, challenge_token, expires_at) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id, challenge_token, expires_at
    `,
      [accountSessionId, cryptoProfileId, challengeToken, expiresAt]
    );
    return result.rows[0];
  },

  async findValidChallenge(accountSessionId, cryptoProfileId, challengeToken) {
    const result = await this.query(
      `
      SELECT id, challenge_token FROM auth_challenges 
      WHERE account_session_id = $1 
        AND crypto_profile_id = $2 
        AND challenge_token = $3 
        AND expires_at > CURRENT_TIMESTAMP 
        AND used = FALSE
    `,
      [accountSessionId, cryptoProfileId, challengeToken]
    );
    return result.rows[0] || null;
  },

  async markChallengeUsed(challengeId) {
    await this.query(
      "UPDATE auth_challenges SET used = TRUE, used_at = CURRENT_TIMESTAMP WHERE id = $1",
      [challengeId]
    );
  },

  // Audit logging helper
  async logAuditEvent(
    accountId,
    cryptoProfileId,
    eventType,
    eventCategory,
    ipAddress,
    userAgent,
    metadata = {}
  ) {
    await this.query(
      `
      INSERT INTO audit_events (account_id, crypto_profile_id, event_type, event_category, ip_address, user_agent, metadata) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
      [
        accountId,
        cryptoProfileId,
        eventType,
        eventCategory,
        ipAddress,
        userAgent,
        JSON.stringify(metadata),
      ]
    );
  },

  // Message queue helpers
  async queueMessage(messageId, recipientCryptoId, priority = 0) {
    const result = await this.query(
      `
      INSERT INTO message_queue (message_id, recipient_crypto_id, priority) 
      VALUES ($1, $2, $3) 
      RETURNING id, created_at
    `,
      [messageId, recipientCryptoId, priority]
    );
    return result.rows[0];
  },

  async getQueuedMessages(recipientCryptoId) {
    const result = await this.query("SELECT * FROM get_queued_messages($1)", [
      recipientCryptoId,
    ]);
    return result.rows;
  },

  async markMessageDelivered(messageId, queueId = null) {
    const client = await this.getClient();
    try {
      await client.query("BEGIN");

      // Update message delivery status
      await client.query(
        `
        UPDATE messages 
        SET delivered = TRUE, 
            delivered_at = CURRENT_TIMESTAMP,
            delivery_status = 'delivered'
        WHERE id = $1
      `,
        [messageId]
      );

      // Update queue status if queue ID provided
      if (queueId) {
        await client.query(
          `
          UPDATE message_queue 
          SET queue_status = 'delivered', 
              processed_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
          [queueId]
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async markMessageFailed(messageId, queueId, errorMessage) {
    await this.query(
      `
      UPDATE message_queue 
      SET queue_status = 'failed',
          retry_count = retry_count + 1,
          next_retry_at = CURRENT_TIMESTAMP + INTERVAL '5 minutes',
          processed_at = CURRENT_TIMESTAMP,
          error_message = $1
      WHERE id = $2
    `,
      [errorMessage, queueId]
    );

    // Also update message delivery attempts
    await this.query(
      `
      UPDATE messages 
      SET delivery_attempts = delivery_attempts + 1,
          last_delivery_attempt = CURRENT_TIMESTAMP,
          delivery_status = CASE 
            WHEN delivery_attempts >= 3 THEN 'failed'
            ELSE 'pending'
          END
      WHERE id = $1
    `,
      [messageId]
    );
  },

  // User presence helpers
  async updateUserPresence(cryptoProfileId, status, connectionDelta = 0) {
    await this.query("SELECT update_user_presence($1, $2, $3)", [
      cryptoProfileId,
      status,
      connectionDelta,
    ]);
  },

  async getUserPresence(cryptoProfileId) {
    const result = await this.query(
      "SELECT * FROM user_presence WHERE crypto_profile_id = $1",
      [cryptoProfileId]
    );
    return result.rows[0] || null;
  },

  async getOnlineUsers() {
    const result = await this.query(
      `
      SELECT up.crypto_profile_id, up.status, up.last_seen, up.connection_count, a.username
      FROM user_presence up
      JOIN crypto_profiles cp ON up.crypto_profile_id = cp.id
      JOIN accounts a ON cp.account_id = a.id
      WHERE up.status = 'online' AND up.connection_count > 0
      ORDER BY up.last_seen DESC
    `
    );
    return result.rows;
  },

  // Queue processing helpers
  async processMessageQueue() {
    // Get all users with queued messages who are currently online
    const result = await this.query(
      `
      SELECT DISTINCT mq.recipient_crypto_id, up.status, up.connection_count
      FROM message_queue mq
      JOIN user_presence up ON mq.recipient_crypto_id = up.crypto_profile_id
      WHERE mq.queue_status = 'queued' 
        AND up.status = 'online' 
        AND up.connection_count > 0
        AND mq.next_retry_at <= CURRENT_TIMESTAMP
    `
    );
    return result.rows;
  },

  async cleanupExpiredData() {
    const results = await Promise.all([
      this.query("SELECT cleanup_expired_challenges()"),
      this.query("SELECT cleanup_expired_sessions()"),
      this.query("SELECT cleanup_expired_messages()"),
    ]);

    return {
      expiredChallenges: results[0].rows[0].cleanup_expired_challenges,
      expiredSessions: results[1].rows[0].cleanup_expired_sessions,
      expiredMessages: results[2].rows[0].cleanup_expired_messages,
    };
  },
};

module.exports = db;
