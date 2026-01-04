const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

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

// Database initialization function - called explicitly by server startup
async function initializeDatabase() {
  const maxRetries = 10;
  const retryDelay = 2000; // 2 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `Checking VoidLink database schema (attempt ${attempt}/${maxRetries})...`
      );

      // First check specifically for message_queue table to prevent the exact issue described
      try {
        const messageQueueCheck = await pool.query(`
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'message_queue' AND table_schema = 'public'
        `);

        if (messageQueueCheck.rows.length > 0) {
          console.log(
            "Database schema verified - message_queue table exists"
          );
          return;
        }
      } catch (error) {
        console.log(
          "message_queue table check failed, proceeding with full initialization"
        );
      }

      // Check if tables exist instead of running init.sql again
      const tablesResult = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('accounts', 'messages', 'message_queue', 'contacts', 'crypto_profiles')
      `);

      const existingTables = tablesResult.rows.map((row) => row.table_name);
      const requiredTables = [
        "accounts",
        "messages",
        "message_queue",
        "contacts",
        "crypto_profiles",
      ];
      const missingTables = requiredTables.filter(
        (table) => !existingTables.includes(table)
      );

      if (missingTables.length === 0) {
        console.log("Database tables verified - proceeding to update functions/schema...");
      } else {
        console.log(`Missing tables: ${missingTables.join(", ")}`);
      }

      console.log(`Missing tables: ${missingTables.join(", ")}`);
      console.log("Running database initialization...");

      // Only run init.sql if tables are missing
      const initSqlPath = path.join(__dirname, "init.sql");
      const initSql = fs.readFileSync(initSqlPath, "utf8");

      // Execute the SQL script without transaction wrapping
      // DDL statements should not be wrapped in transactions
      const client = await pool.connect();
      try {
        console.log("Executing SQL script...");
        console.log(`SQL script length: ${initSql.length} characters`);

        // Split the SQL into individual statements for better error handling
        const statements = initSql
          .split(";")
          .map((stmt) => stmt.trim())
          .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

        console.log(`� Found ${statements.length} SQL statements to execute`);

        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i];
          if (statement.length > 0) {
            try {
              console.log(
                `Executing statement ${i + 1}/${statements.length}...`
              );
              await client.query(statement);
            } catch (stmtError) {
              console.error(`Statement ${i + 1} failed:`, stmtError.message);
              console.error(
                `Failed statement: ${statement.substring(0, 200)}...`
              );
              throw stmtError;
            }
          }
        }

        console.log("Database schema initialized successfully");
      } catch (sqlError) {
        console.error("SQL execution error:", sqlError.message);
        throw sqlError;
      } finally {
        client.release();
      }
      return;
    } catch (error) {
      console.error(
        `Database initialization attempt ${attempt} failed:`,
        error.message
      );

      if (attempt === maxRetries) {
        console.error("Database initialization failed after all retries");
        throw error;
      }

      console.log(`⏳ Retrying in ${retryDelay / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
}

const db = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  initializeDatabase,

  // Helper functions for account operations
  async findAccountByUsername(username) {
    const result = await pool.query(
      "SELECT id, username, password_hash, account_status, created_at FROM accounts WHERE username = $1",
      [username]
    );
    return result.rows[0] || null;
  },

  async createAccount(username, passwordHash) {
    const result = await pool.query(
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
    const result = await pool.query(
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
    const result = await pool.query(
      "SELECT id, public_key, cloud_backup_enabled, encrypted_private_key_backup FROM crypto_profiles WHERE account_id = $1",
      [accountId]
    );
    return result.rows[0] || null;
  },

  async createCryptoProfile(accountId, publicKey) {
    const result = await pool.query(
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
    const result = await pool.query(
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
    const result = await pool.query(
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
    const result = await pool.query(
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
    await pool.query(
      "UPDATE auth_challenges SET used = TRUE, used_at = CURRENT_TIMESTAMP WHERE id = $1",
      [challengeId]
    );
  },

  async logAuditEvent(
    accountId,
    cryptoProfileId,
    eventType,
    eventCategory,
    ipAddress,
    userAgent,
    metadata = {}
  ) {
    try {
      let metadataJson = "{}";
      try {
        metadataJson = JSON.stringify(metadata);
      } catch (e) {
        console.error("Failed to stringify metadata:", e);
        metadataJson = JSON.stringify({ error: "Metadata stringify failed" });
      }

      await pool.query(
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
          metadataJson,
        ]
      );
    } catch (error) {
      console.log(`Audit logging error: ${error.message}`);
    }
  },

  // Message queue helpers - now fully functional
  async queueMessage(messageId, recipientCryptoId, priority = 0) {
    const result = await pool.query(
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
    try {
      const result = await pool.query(
        `
        SELECT mq.id as queue_id, mq.message_id, mq.priority, mq.created_at as queued_at,
               m.sender_crypto_id, m.encrypted_payload, m.message_type, m.created_at as message_created
        FROM message_queue mq
        INNER JOIN messages m ON mq.message_id = m.id
        WHERE mq.recipient_crypto_id = $1 
          AND mq.processed_at IS NULL 
          AND mq.failed_at IS NULL
        ORDER BY mq.priority DESC, mq.created_at ASC
      `,
        [recipientCryptoId]
      );
      return result.rows;
    } catch (error) {
      console.error(`Get queued messages error: ${error.message}`);
      return [];
    }
  },

  async markMessageDelivered(messageId, queueId = null) {
    try {
      // Update message delivery status
      await pool.query(
        `
        UPDATE messages 
        SET delivered = TRUE, 
            delivered_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
        [messageId]
      );

      // Mark queue item as processed if provided
      if (queueId) {
        await pool.query(
          `
          UPDATE message_queue 
          SET processed_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
          [queueId]
        );
      }
    } catch (error) {
      console.log(`Mark message delivered error: ${error.message}`);
    }
  },

  async markMessageFailed(messageId, queueId, errorMessage) {
    try {
      await pool.query(
        `
        UPDATE message_queue 
        SET failed_at = CURRENT_TIMESTAMP,
            error_message = $1,
            retry_count = retry_count + 1
        WHERE id = $2
      `,
        [errorMessage, queueId]
      );
      console.log(`Message ${messageId} failed: ${errorMessage}`);
    } catch (error) {
      console.log(`Mark message failed error: ${error.message}`);
    }
  },

  // User presence helpers - now fully functional
  async updateUserPresence(cryptoProfileId, status, connectionDelta = 0) {
    try {
      await pool.query(
        `
        INSERT INTO user_presence (crypto_profile_id, status, connection_count, updated_at)
        VALUES ($1, $2, GREATEST(0, $3), CURRENT_TIMESTAMP)
        ON CONFLICT (crypto_profile_id) 
        DO UPDATE SET 
          status = $2,
          connection_count = GREATEST(0, user_presence.connection_count + $3),
          updated_at = CURRENT_TIMESTAMP,
          last_seen = CASE 
            WHEN $2 = 'offline' THEN CURRENT_TIMESTAMP 
            ELSE user_presence.last_seen 
          END
      `,
        [cryptoProfileId, status, connectionDelta]
      );
    } catch (error) {
      console.log(`Update user presence error: ${error.message}`);
    }
  },

  async getUserPresence(cryptoProfileId) {
    try {
      const result = await pool.query(
        `
        SELECT status, last_seen, connection_count, updated_at,
               (connection_count > 0 AND status != 'offline') as is_online
        FROM user_presence 
        WHERE crypto_profile_id = $1
      `,
        [cryptoProfileId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.log(`Get user presence error: ${error.message}`);
      return null;
    }
  },

  async getOnlineUsers() {
    try {
      const result = await pool.query(
        `
        SELECT up.crypto_profile_id, up.status, up.last_seen, up.connection_count,
               a.username
        FROM user_presence up
        INNER JOIN crypto_profiles cp ON up.crypto_profile_id = cp.id
        INNER JOIN accounts a ON cp.account_id = a.id
        WHERE up.connection_count > 0 AND up.status != 'offline'
        ORDER BY up.updated_at DESC
      `
      );
      return result.rows;
    } catch (error) {
      console.log(`Get online users error: ${error.message}`);
      return [];
    }
  },

  // Queue processing helpers - now fully functional
  async processMessageQueue() {
    try {
      const result = await pool.query(
        `
        SELECT mq.id as queue_id, mq.message_id, mq.recipient_crypto_id, mq.priority,
               m.sender_crypto_id, m.encrypted_payload, m.message_type, m.created_at
        FROM message_queue mq
        INNER JOIN messages m ON mq.message_id = m.id
        WHERE mq.processed_at IS NULL 
          AND mq.failed_at IS NULL
          AND mq.retry_count < 3
        ORDER BY mq.priority DESC, mq.created_at ASC
        LIMIT 100
      `
      );
      return result.rows;
    } catch (error) {
      console.log(`Process message queue error: ${error.message}`);
      return [];
    }
  },

  async cleanupExpiredData() {
    try {
      const results = await Promise.all([
        pool.query("SELECT cleanup_expired_challenges()").catch(() => ({
          rows: [{ cleanup_expired_challenges: 0 }],
        })),
        pool.query("SELECT cleanup_expired_sessions()").catch(() => ({
          rows: [{ cleanup_expired_sessions: 0 }],
        })),
        // Clean up old processed queue items (older than 24 hours)
        pool
          .query(
            `DELETE FROM message_queue 
           WHERE processed_at IS NOT NULL 
             AND processed_at < CURRENT_TIMESTAMP - INTERVAL '24 hours'`
          )
          .then((result) => ({
            rows: [{ cleanup_expired_messages: result.rowCount }],
          }))
          .catch(() => ({ rows: [{ cleanup_expired_messages: 0 }] })),
      ]);

      return {
        expiredChallenges: results[0].rows[0].cleanup_expired_challenges,
        expiredSessions: results[1].rows[0].cleanup_expired_sessions,
        expiredMessages: results[2].rows[0].cleanup_expired_messages,
      };
    } catch (error) {
      console.log("Cleanup error:", error.message);
      return {
        expiredChallenges: 0,
        expiredSessions: 0,
        expiredMessages: 0,
      };
    }
  },
};

module.exports = db;
