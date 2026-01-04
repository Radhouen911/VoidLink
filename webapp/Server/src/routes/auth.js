const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nacl = require("tweetnacl");
const db = require("../database/db");
const {
  requireAccountSession,
  attachCryptoProfile,
} = require("../middleware/auth");

const router = express.Router();

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map();

// Rate limiting middleware for sensitive endpoints
const createRateLimit = (maxAttempts, windowMs, keyGenerator) => {
  return (req, res, next) => {
    // Skip rate limiting in development/test mode
    if (
      process.env.NODE_ENV === "development" ||
      process.env.NODE_ENV === "test" ||
      !process.env.NODE_ENV
    ) {
      return next();
    }

    const clientKey = keyGenerator(req);
    const now = Date.now();

    if (!rateLimitStore.has(clientKey)) {
      rateLimitStore.set(clientKey, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const limit = rateLimitStore.get(clientKey);

    if (now > limit.resetTime) {
      rateLimitStore.set(clientKey, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (limit.count >= maxAttempts) {
      return res.status(429).json({
        error: "RATE_LIMIT_EXCEEDED",
        message: "Too many attempts. Try again later.",
        retryAfter: Math.ceil((limit.resetTime - now) / 1000),
      });
    }

    limit.count++;
    next();
  };
};

// Rate limiters for different endpoints
const loginRateLimit = createRateLimit(
  5,
  15 * 60 * 1000,
  (req) => req.ip + ":login"
);
const registerRateLimit = createRateLimit(
  3,
  60 * 60 * 1000,
  (req) => req.ip + ":register"
);
const challengeRateLimit = createRateLimit(
  10,
  5 * 60 * 1000,
  (req) => req.ip + ":" + (req.accountSession?.accountId || "unknown")
);

// Helper function to convert hex public key to Uint8Array
const hexToUint8Array = (hexString) => {
  try {
    const cleanHex = hexString.replace(/\s+/g, "");

    if (cleanHex.includes("BEGIN PUBLIC KEY")) {
      const hexMatch = cleanHex.match(/[0-9a-fA-F]{64}/);
      if (hexMatch) {
        return new Uint8Array(Buffer.from(hexMatch[0], "hex"));
      }
      throw new Error("Invalid PEM format");
    }

    if (cleanHex.length === 64) {
      return new Uint8Array(Buffer.from(cleanHex, "hex"));
    }

    throw new Error("Invalid public key format");
  } catch (error) {
    throw new Error("Invalid public key: " + error.message);
  }
};

// Helper function to verify Ed25519 signature
const verifySignature = (message, signature, publicKey) => {
  try {
    // Handle challenge as hex or UTF-8 (matching Python script behavior)
    let messageBytes;
    try {
      if (/^[0-9a-fA-F]+$/.test(message) && message.length % 2 === 0) {
        messageBytes = Buffer.from(message, "hex");
      } else {
        throw new Error("Not hex");
      }
    } catch (error) {
      messageBytes = Buffer.from(message, "utf8");
    }

    const signatureBytes = Buffer.from(signature, "hex");
    const publicKeyBytes = hexToUint8Array(publicKey);

    if (signatureBytes.length !== 64) {
      throw new Error("Invalid signature length");
    }

    if (publicKeyBytes.length !== 32) {
      throw new Error("Invalid public key length");
    }

    return nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
};

// ============================================================================
// LAYER 1: ACCOUNT MANAGEMENT (Traditional Authentication)
// ============================================================================

// Register new account
router.post("/register", registerRateLimit, async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // Input validation
    if (!username || !password) {
      return res.status(400).json({
        error: "MISSING_FIELDS",
        message: "Username and password are required",
      });
    }

    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({
        error: "INVALID_USERNAME",
        message: "Username must be between 3 and 50 characters",
      });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return res.status(400).json({
        error: "INVALID_USERNAME_FORMAT",
        message:
          "Username can only contain letters, numbers, underscores, and hyphens",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: "WEAK_PASSWORD",
        message: "Password must be at least 8 characters long",
      });
    }

    // Check if username already exists
    const existingAccount = await db.findAccountByUsername(username);
    if (existingAccount) {
      return res.status(409).json({
        error: "USERNAME_EXISTS",
        message: "Username already exists",
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create account
    const account = await db.createAccount(username, passwordHash);

    // Log registration event
    await db.logAuditEvent(
      account.id,
      null,
      "account_registered",
      "account",
      req.ip,
      req.get("User-Agent"),
      { username: account.username }
    );

    res.status(201).json({
      success: true,
      message: "Account registered successfully",
      data: {
        accountId: account.id,
        username: account.username,
        createdAt: account.created_at,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      error: "REGISTRATION_FAILED",
      message: "Internal server error during registration",
    });
  }
});

// Login to account
router.post("/login", loginRateLimit, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: "MISSING_CREDENTIALS",
        message: "Username and password are required",
      });
    }

    // Find account
    const account = await db.findAccountByUsername(username);
    if (!account) {
      // Log failed login attempt
      await db.logAuditEvent(
        null,
        null,
        "login_failed",
        "security",
        req.ip,
        req.get("User-Agent"),
        { username, reason: "account_not_found" }
      );

      return res.status(401).json({
        error: "INVALID_CREDENTIALS",
        message: "Invalid username or password",
      });
    }

    // Check account status
    if (account.account_status !== "active") {
      return res.status(403).json({
        error: "ACCOUNT_SUSPENDED",
        message: "Account is not active",
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(
      password,
      account.password_hash
    );
    if (!isValidPassword) {
      // Log failed login attempt
      await db.logAuditEvent(
        account.id,
        null,
        "login_failed",
        "security",
        req.ip,
        req.get("User-Agent"),
        { reason: "invalid_password" }
      );

      return res.status(401).json({
        error: "INVALID_CREDENTIALS",
        message: "Invalid username or password",
      });
    }

    // Create account session
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const session = await db.createAccountSession(
      account.id,
      sessionToken,
      expiresAt,
      req.ip,
      req.get("User-Agent")
    );

    // Update last login
    await db.query(
      "UPDATE accounts SET last_login = CURRENT_TIMESTAMP WHERE id = $1",
      [account.id]
    );

    // Log successful login
    await db.logAuditEvent(
      account.id,
      null,
      "login_success",
      "account",
      req.ip,
      req.get("User-Agent"),
      { session_id: session.id }
    );

    res.json({
      success: true,
      message: "Login successful",
      data: {
        accountSessionToken: session.session_token,
        accountId: account.id,
        username: account.username,
        expiresAt: session.expires_at,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      error: "LOGIN_FAILED",
      message: "Internal server error during login",
    });
  }
});

// Validate account session
router.get(
  "/session",
  requireAccountSession,
  attachCryptoProfile,
  async (req, res) => {
    try {
      res.json({
        success: true,
        data: {
          account: {
            accountId: req.accountSession.accountId,
            username: req.accountSession.username,
          },
          cryptoProfile: req.cryptoProfile
            ? {
                cryptoProfileId: req.cryptoProfile.crypto_profile_id,
                hasPublicKey: !!req.cryptoProfile.public_key,
                cloudBackupEnabled: req.cryptoProfile.cloud_backup_enabled,
                keyUploadedAt: req.cryptoProfile.key_uploaded_at,
              }
            : null,
        },
      });
    } catch (error) {
      console.error("Session validation error:", error);
      res.status(500).json({
        error: "SESSION_VALIDATION_FAILED",
        message: "Failed to validate session",
      });
    }
  }
);

// Logout (invalidate account session)
router.post("/logout", requireAccountSession, async (req, res) => {
  try {
    // Delete account session (cascades to crypto sessions)
    await db.query("DELETE FROM account_sessions WHERE id = $1", [
      req.accountSession.sessionId,
    ]);

    // Log logout event
    await db.logAuditEvent(
      req.accountSession.accountId,
      null,
      "logout",
      "account",
      req.ip,
      req.get("User-Agent")
    );

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      error: "LOGOUT_FAILED",
      message: "Failed to logout",
    });
  }
});

// ============================================================================
// LAYER 2: CRYPTO MANAGEMENT (Requires Account Session)
// ============================================================================

// Upload public key to account
router.post("/crypto/upload-key", requireAccountSession, async (req, res) => {
  try {
    const { publicKey } = req.body;

    if (!publicKey) {
      return res.status(400).json({
        error: "MISSING_PUBLIC_KEY",
        message: "Public key is required",
      });
    }

    // Validate public key format (Ed25519)
    try {
      hexToUint8Array(publicKey);
    } catch (error) {
      return res.status(400).json({
        error: "INVALID_PUBLIC_KEY",
        message: "Public key must be valid Ed25519 format (64-character hex)",
      });
    }

    // Check if crypto profile already exists
    const existingProfile = await db.findCryptoProfileByAccount(
      req.accountSession.accountId
    );
    if (existingProfile) {
      return res.status(409).json({
        error: "CRYPTO_PROFILE_EXISTS",
        message: "Crypto profile already exists for this account",
      });
    }

    // Create crypto profile
    const cryptoProfile = await db.createCryptoProfile(
      req.accountSession.accountId,
      publicKey
    );

    // Log crypto profile creation
    await db.logAuditEvent(
      req.accountSession.accountId,
      cryptoProfile.id,
      "crypto_profile_created",
      "crypto",
      req.ip,
      req.get("User-Agent")
    );

    res.status(201).json({
      success: true,
      message: "Public key uploaded successfully",
      data: {
        cryptoProfileId: cryptoProfile.id,
        keyUploadedAt: cryptoProfile.key_uploaded_at,
      },
    });
  } catch (error) {
    console.error("Key upload error:", error);
    res.status(500).json({
      error: "KEY_UPLOAD_FAILED",
      message: "Failed to upload public key",
    });
  }
});

// Enable cloud backup of encrypted private key
router.post(
  "/crypto/enable-backup",
  requireAccountSession,
  async (req, res) => {
    try {
      const { encryptedPrivateKey } = req.body;

      if (!encryptedPrivateKey) {
        return res.status(400).json({
          error: "MISSING_ENCRYPTED_KEY",
          message: "Encrypted private key is required",
        });
      }

      // Get crypto profile
      const cryptoProfile = await db.findCryptoProfileByAccount(
        req.accountSession.accountId
      );
      if (!cryptoProfile) {
        return res.status(404).json({
          error: "NO_CRYPTO_PROFILE",
          message: "No crypto profile found. Upload public key first.",
        });
      }

      if (cryptoProfile.cloud_backup_enabled) {
        return res.status(409).json({
          error: "BACKUP_ALREADY_ENABLED",
          message: "Cloud backup is already enabled",
        });
      }

      // Enable cloud backup
      await db.query(
        `
      UPDATE crypto_profiles 
      SET encrypted_private_key_backup = $1, 
          cloud_backup_enabled = TRUE, 
          backup_created_at = CURRENT_TIMESTAMP,
          backup_updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `,
        [encryptedPrivateKey, cryptoProfile.id]
      );

      // Log backup enabled
      await db.logAuditEvent(
        req.accountSession.accountId,
        cryptoProfile.id,
        "cloud_backup_enabled",
        "crypto",
        req.ip,
        req.get("User-Agent")
      );

      res.json({
        success: true,
        message: "Cloud backup enabled successfully",
      });
    } catch (error) {
      console.error("Enable backup error:", error);
      res.status(500).json({
        error: "ENABLE_BACKUP_FAILED",
        message: "Failed to enable cloud backup",
      });
    }
  }
);

// Disable cloud backup
router.post(
  "/crypto/disable-backup",
  requireAccountSession,
  async (req, res) => {
    try {
      // Get crypto profile
      const cryptoProfile = await db.findCryptoProfileByAccount(
        req.accountSession.accountId
      );
      if (!cryptoProfile) {
        return res.status(404).json({
          error: "NO_CRYPTO_PROFILE",
          message: "No crypto profile found",
        });
      }

      if (!cryptoProfile.cloud_backup_enabled) {
        return res.status(409).json({
          error: "BACKUP_NOT_ENABLED",
          message: "Cloud backup is not enabled",
        });
      }

      // Disable cloud backup and remove encrypted key
      await db.query(
        `
      UPDATE crypto_profiles 
      SET encrypted_private_key_backup = NULL, 
          cloud_backup_enabled = FALSE
      WHERE id = $1
    `,
        [cryptoProfile.id]
      );

      // Log backup disabled
      await db.logAuditEvent(
        req.accountSession.accountId,
        cryptoProfile.id,
        "cloud_backup_disabled",
        "crypto",
        req.ip,
        req.get("User-Agent")
      );

      res.json({
        success: true,
        message: "Cloud backup disabled successfully",
      });
    } catch (error) {
      console.error("Disable backup error:", error);
      res.status(500).json({
        error: "DISABLE_BACKUP_FAILED",
        message: "Failed to disable cloud backup",
      });
    }
  }
);

// Fetch encrypted private key backup
router.get("/crypto/fetch-backup", requireAccountSession, async (req, res) => {
  try {
    // Get crypto profile
    const cryptoProfile = await db.findCryptoProfileByAccount(
      req.accountSession.accountId
    );
    if (!cryptoProfile) {
      return res.status(404).json({
        error: "NO_CRYPTO_PROFILE",
        message: "No crypto profile found",
      });
    }

    if (
      !cryptoProfile.cloud_backup_enabled ||
      !cryptoProfile.encrypted_private_key_backup
    ) {
      return res.status(404).json({
        error: "NO_BACKUP_AVAILABLE",
        message: "No cloud backup available",
      });
    }

    // Log backup access
    await db.logAuditEvent(
      req.accountSession.accountId,
      cryptoProfile.id,
      "cloud_backup_accessed",
      "crypto",
      req.ip,
      req.get("User-Agent")
    );

    res.json({
      success: true,
      data: {
        encryptedPrivateKey: cryptoProfile.encrypted_private_key_backup,
      },
    });
  } catch (error) {
    console.error("Fetch backup error:", error);
    res.status(500).json({
      error: "FETCH_BACKUP_FAILED",
      message: "Failed to fetch backup",
    });
  }
});

// Get crypto challenge (requires account session + crypto profile)
router.post(
  "/crypto/challenge",
  requireAccountSession,
  challengeRateLimit,
  async (req, res) => {
    try {
      // Get crypto profile
      const cryptoProfile = await db.findCryptoProfileByAccount(
        req.accountSession.accountId
      );
      if (!cryptoProfile) {
        return res.status(404).json({
          error: "NO_CRYPTO_PROFILE",
          message: "No crypto profile found. Upload public key first.",
        });
      }

      // Generate cryptographic challenge
      const challenge = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Store challenge with crypto profile binding (security fix)
      await db.createChallenge(
        req.accountSession.sessionId,
        cryptoProfile.id,
        challenge,
        expiresAt
      );

      // Clean up expired challenges
      await db.query(
        "DELETE FROM auth_challenges WHERE expires_at < CURRENT_TIMESTAMP"
      );

      res.json({
        success: true,
        data: {
          challenge,
          expiresAt: expiresAt.toISOString(),
        },
      });
    } catch (error) {
      console.error("Challenge generation error:", error);
      res.status(500).json({
        error: "CHALLENGE_FAILED",
        message: "Failed to generate crypto challenge",
      });
    }
  }
);

// Verify crypto challenge and create crypto session
router.post("/crypto/verify", requireAccountSession, async (req, res) => {
  try {
    const { challenge, signature } = req.body;

    if (!challenge || !signature) {
      return res.status(400).json({
        error: "MISSING_FIELDS",
        message: "Challenge and signature are required",
      });
    }

    // Get crypto profile
    const cryptoProfile = await db.findCryptoProfileByAccount(
      req.accountSession.accountId
    );
    if (!cryptoProfile) {
      return res.status(404).json({
        error: "NO_CRYPTO_PROFILE",
        message: "No crypto profile found",
      });
    }

    // Verify challenge exists and is bound to correct crypto profile (security fix)
    const validChallenge = await db.findValidChallenge(
      req.accountSession.sessionId,
      cryptoProfile.id,
      challenge
    );

    if (!validChallenge) {
      return res.status(401).json({
        error: "INVALID_CHALLENGE",
        message: "Challenge is invalid, expired, or already used",
      });
    }

    // Verify Ed25519 signature
    const isValidSignature = verifySignature(
      challenge,
      signature,
      cryptoProfile.public_key
    );

    if (!isValidSignature) {
      // Log failed crypto authentication
      await db.logAuditEvent(
        req.accountSession.accountId,
        cryptoProfile.id,
        "crypto_auth_failed",
        "security",
        req.ip,
        req.get("User-Agent"),
        { reason: "invalid_signature", challenge_id: validChallenge.id }
      );

      return res.status(401).json({
        error: "INVALID_SIGNATURE",
        message: "Signature verification failed",
      });
    }

    // Mark challenge as used
    await db.markChallengeUsed(validChallenge.id);

    // Create crypto session
    const cryptoToken = crypto.randomBytes(32).toString("hex");
    const cryptoExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const cryptoSession = await db.createCryptoSession(
      req.accountSession.sessionId,
      cryptoProfile.id,
      cryptoToken,
      cryptoExpiresAt
    );

    // Log successful crypto authentication
    await db.logAuditEvent(
      req.accountSession.accountId,
      cryptoProfile.id,
      "crypto_auth_success",
      "crypto",
      req.ip,
      req.get("User-Agent"),
      { challenge_id: validChallenge.id, crypto_session_id: cryptoSession.id }
    );

    res.json({
      success: true,
      message: "Crypto authentication successful",
      data: {
        cryptoSessionToken: cryptoSession.crypto_token,
        cryptoProfileId: cryptoProfile.id,
        expiresAt: cryptoSession.expires_at,
      },
    });
  } catch (error) {
    console.error("Crypto verification error:", error);
    res.status(500).json({
      error: "CRYPTO_VERIFICATION_FAILED",
      message: "Crypto authentication verification failed",
    });
  }
});

module.exports = router;
