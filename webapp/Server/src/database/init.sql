-- VoidLink Database Schema for PostgreSQL
-- Two-Layer Authentication: Account + Crypto Security

-- Enable UUID extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- LAYER 1: ACCOUNT MANAGEMENT (Traditional Authentication)
-- ============================================================================

-- Accounts table - traditional username/password authentication
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    account_status VARCHAR(20) DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'deleted'))
);

-- Account sessions table - traditional session management
CREATE TABLE IF NOT EXISTS account_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- ============================================================================
-- LAYER 2: CRYPTO MANAGEMENT (Zero-Trust Cryptographic Operations)
-- ============================================================================

-- Crypto profiles table - cryptographic identity linked to accounts
CREATE TABLE IF NOT EXISTS crypto_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL,
    public_key TEXT NOT NULL,
    encrypted_private_key_backup TEXT,
    cloud_backup_enabled BOOLEAN DEFAULT FALSE,
    key_uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    backup_created_at TIMESTAMP,
    backup_updated_at TIMESTAMP,
    key_algorithm VARCHAR(20) DEFAULT 'Ed25519',
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    UNIQUE(account_id) -- One crypto profile per account
);

-- Crypto sessions table - challenge-response authentication sessions
CREATE TABLE IF NOT EXISTS crypto_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_session_id UUID NOT NULL,
    crypto_profile_id UUID NOT NULL,
    crypto_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_session_id) REFERENCES account_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (crypto_profile_id) REFERENCES crypto_profiles(id) ON DELETE CASCADE
);

-- Auth challenges table - temporary challenge storage for crypto auth
CREATE TABLE IF NOT EXISTS auth_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_session_id UUID NOT NULL,
    crypto_profile_id UUID NOT NULL,
    challenge_token VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP,
    FOREIGN KEY (account_session_id) REFERENCES account_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (crypto_profile_id) REFERENCES crypto_profiles(id) ON DELETE CASCADE
);

-- ============================================================================
-- APPLICATION DATA (Requires Crypto Authentication)
-- ============================================================================

-- Messages table - stores encrypted messages (zero-trust) with enhanced delivery tracking
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_crypto_id UUID NOT NULL,
    recipient_crypto_id UUID NOT NULL,
    encrypted_payload TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'message',
    delivered BOOLEAN DEFAULT FALSE,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    deleted_by_sender BOOLEAN DEFAULT FALSE,
    deleted_by_recipient BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    -- New fields for message queuing
    delivery_attempts INTEGER DEFAULT 0,
    last_delivery_attempt TIMESTAMP,
    delivery_status VARCHAR(20) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'delivered', 'failed', 'expired')),
    priority INTEGER DEFAULT 0, -- Higher numbers = higher priority
    FOREIGN KEY (sender_crypto_id) REFERENCES crypto_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_crypto_id) REFERENCES crypto_profiles(id) ON DELETE CASCADE
);

-- Contacts table - manages user relationships
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_crypto_id UUID NOT NULL,
    contact_crypto_id UUID NOT NULL,
    contact_alias VARCHAR(100),
    user_declared_verified BOOLEAN DEFAULT FALSE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_crypto_id) REFERENCES crypto_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_crypto_id) REFERENCES crypto_profiles(id) ON DELETE CASCADE,
    UNIQUE(owner_crypto_id, contact_crypto_id)
);

-- Message queue table - manages offline message delivery
CREATE TABLE IF NOT EXISTS message_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL,
    recipient_crypto_id UUID NOT NULL,
    queue_status VARCHAR(20) DEFAULT 'queued' CHECK (queue_status IN ('queued', 'processing', 'delivered', 'failed', 'expired')),
    priority INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    error_message TEXT,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_crypto_id) REFERENCES crypto_profiles(id) ON DELETE CASCADE
);

-- User presence tracking for queue delivery optimization
CREATE TABLE IF NOT EXISTS user_presence (
    crypto_profile_id UUID PRIMARY KEY,
    status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline')),
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    connection_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (crypto_profile_id) REFERENCES crypto_profiles(id) ON DELETE CASCADE
);

-- ============================================================================
-- AUDIT & SECURITY
-- ============================================================================

-- Audit events table - security and activity logging
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID,
    crypto_profile_id UUID,
    event_type VARCHAR(50) NOT NULL,
    event_category VARCHAR(20) DEFAULT 'security' CHECK (event_category IN ('security', 'account', 'crypto', 'messaging')),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    FOREIGN KEY (crypto_profile_id) REFERENCES crypto_profiles(id) ON DELETE SET NULL
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Account management indexes
CREATE INDEX IF NOT EXISTS idx_accounts_username ON accounts(username);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(account_status) WHERE account_status = 'active';

-- Session management indexes
CREATE INDEX IF NOT EXISTS idx_account_sessions_token ON account_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_account_sessions_active ON account_sessions(account_id, expires_at) 
    WHERE expires_at > CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_crypto_sessions_token ON crypto_sessions(crypto_token);
CREATE INDEX IF NOT EXISTS idx_crypto_sessions_active ON crypto_sessions(account_session_id, expires_at) 
    WHERE expires_at > CURRENT_TIMESTAMP;

-- Crypto profile indexes
CREATE INDEX IF NOT EXISTS idx_crypto_profiles_account ON crypto_profiles(account_id);
CREATE INDEX IF NOT EXISTS idx_crypto_profiles_backup ON crypto_profiles(cloud_backup_enabled) 
    WHERE cloud_backup_enabled = TRUE;

-- Message indexes (with soft delete filtering and delivery tracking)
CREATE INDEX IF NOT EXISTS idx_messages_recipient_time ON messages(recipient_crypto_id, created_at DESC) 
    WHERE deleted_by_recipient = FALSE;
CREATE INDEX IF NOT EXISTS idx_messages_sender_time ON messages(sender_crypto_id, created_at DESC) 
    WHERE deleted_by_sender = FALSE;
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_crypto_id, recipient_crypto_id, created_at DESC) 
    WHERE deleted_by_sender = FALSE AND deleted_by_recipient = FALSE;
CREATE INDEX IF NOT EXISTS idx_messages_delivery_status ON messages(delivery_status, created_at) 
    WHERE delivery_status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_messages_undelivered ON messages(recipient_crypto_id, delivered, created_at) 
    WHERE delivered = FALSE;

-- Message queue indexes for efficient processing
CREATE INDEX IF NOT EXISTS idx_message_queue_recipient ON message_queue(recipient_crypto_id, queue_status);
CREATE INDEX IF NOT EXISTS idx_message_queue_processing ON message_queue(queue_status, next_retry_at) 
    WHERE queue_status IN ('queued', 'failed');
CREATE INDEX IF NOT EXISTS idx_message_queue_priority ON message_queue(priority DESC, created_at ASC) 
    WHERE queue_status = 'queued';

-- User presence indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status, last_seen) 
    WHERE status = 'online';
CREATE INDEX IF NOT EXISTS idx_user_presence_updated ON user_presence(updated_at) 
    WHERE status != 'offline';

-- Contact indexes
CREATE INDEX IF NOT EXISTS idx_contacts_owner ON contacts(owner_crypto_id);
CREATE INDEX IF NOT EXISTS idx_contacts_lookup ON contacts(owner_crypto_id, contact_crypto_id);

-- Challenge cleanup index
CREATE INDEX IF NOT EXISTS idx_challenges_expires ON auth_challenges(expires_at) 
    WHERE used = FALSE;

-- Audit indexes
CREATE INDEX IF NOT EXISTS idx_audit_account_time ON audit_events(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_category ON audit_events(event_category, created_at DESC);

-- ============================================================================
-- UTILITY VIEWS
-- ============================================================================

-- Active messages view (not soft deleted)
CREATE OR REPLACE VIEW active_messages AS
SELECT * FROM messages 
WHERE deleted_by_sender = FALSE AND deleted_by_recipient = FALSE;

-- User inbox view (not deleted by recipient)
CREATE OR REPLACE VIEW user_inbox AS
SELECT * FROM messages 
WHERE deleted_by_recipient = FALSE;

-- User sent messages view (not deleted by sender)
CREATE OR REPLACE VIEW user_sent AS
SELECT * FROM messages 
WHERE deleted_by_sender = FALSE;

-- Account with crypto profile view
CREATE OR REPLACE VIEW accounts_with_crypto AS
SELECT 
    a.id as account_id,
    a.username,
    a.created_at as account_created,
    a.last_login,
    cp.id as crypto_profile_id,
    cp.public_key,
    cp.cloud_backup_enabled,
    cp.key_uploaded_at
FROM accounts a
LEFT JOIN crypto_profiles cp ON a.id = cp.account_id;

-- ============================================================================
-- CLEANUP FUNCTIONS
-- ============================================================================

-- Clean expired challenges
CREATE OR REPLACE FUNCTION cleanup_expired_challenges()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM auth_challenges 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Clean expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Clean expired account sessions (cascades to crypto sessions)
    DELETE FROM account_sessions 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECURITY COMMENTS
-- ============================================================================

COMMENT ON TABLE accounts IS 'Traditional account authentication - username/password';
COMMENT ON TABLE crypto_profiles IS 'Cryptographic identity linked to accounts - zero-trust layer';
COMMENT ON TABLE messages IS 'Encrypted message payloads - server never sees plaintext';
COMMENT ON COLUMN messages.encrypted_payload IS 'Opaque encrypted blob - server does not interpret content';
COMMENT ON COLUMN contacts.user_declared_verified IS 'User-declared trust flag - not cryptographically enforced by server';
COMMENT ON TABLE audit_events IS 'Security audit log - tracks both account and crypto operations';

COMMENT ON TABLE account_sessions IS 'Traditional session management for account operations';
COMMENT ON TABLE crypto_sessions IS 'Challenge-response sessions for cryptographic operations';
COMMENT ON COLUMN crypto_profiles.encrypted_private_key_backup IS 'Optional encrypted private key backup - encrypted by user passphrase';

-- ============================================================================
-- MESSAGE QUEUE FUNCTIONS
-- ============================================================================

-- Clean expired messages and failed queue entries
CREATE OR REPLACE FUNCTION cleanup_expired_messages()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Clean expired messages
    DELETE FROM messages 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean failed queue entries that exceeded max retries
    DELETE FROM message_queue 
    WHERE queue_status = 'failed' 
      AND retry_count >= max_retries 
      AND processed_at < CURRENT_TIMESTAMP - INTERVAL '24 hours';
    
    -- Clean expired queue entries
    DELETE FROM message_queue 
    WHERE queue_status = 'expired';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Process message queue for a specific user
CREATE OR REPLACE FUNCTION get_queued_messages(user_crypto_id UUID)
RETURNS TABLE(
    queue_id UUID,
    message_id UUID,
    encrypted_payload TEXT,
    message_type VARCHAR(20),
    sender_crypto_id UUID,
    created_at TIMESTAMP,
    priority INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mq.id,
        m.id,
        m.encrypted_payload,
        m.message_type,
        m.sender_crypto_id,
        m.created_at,
        mq.priority
    FROM message_queue mq
    JOIN messages m ON mq.message_id = m.id
    WHERE mq.recipient_crypto_id = user_crypto_id
      AND mq.queue_status = 'queued'
      AND mq.next_retry_at <= CURRENT_TIMESTAMP
    ORDER BY mq.priority DESC, mq.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Update user presence status
CREATE OR REPLACE FUNCTION update_user_presence(
    user_crypto_id UUID,
    new_status VARCHAR(20),
    connection_delta INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_presence (crypto_profile_id, status, connection_count, updated_at)
    VALUES (user_crypto_id, new_status, GREATEST(0, connection_delta), CURRENT_TIMESTAMP)
    ON CONFLICT (crypto_profile_id) 
    DO UPDATE SET 
        status = EXCLUDED.status,
        connection_count = GREATEST(0, user_presence.connection_count + connection_delta),
        last_seen = CASE 
            WHEN EXCLUDED.status = 'offline' THEN CURRENT_TIMESTAMP
            ELSE user_presence.last_seen
        END,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MESSAGE QUEUE COMMENTS
-- ============================================================================

COMMENT ON TABLE message_queue IS 'Manages offline message delivery with retry logic';
COMMENT ON TABLE user_presence IS 'Tracks user online/offline status for queue optimization';
COMMENT ON COLUMN messages.delivery_status IS 'Tracks message delivery state for queue processing';
COMMENT ON COLUMN message_queue.retry_count IS 'Number of delivery attempts for failed messages';
COMMENT ON COLUMN user_presence.connection_count IS 'Number of active WebSocket connections for user';