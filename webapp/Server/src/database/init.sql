-- VoidLink Database Schema for PostgreSQL
-- Zero-Trust Secure Messaging Platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table - stores public keys and metadata
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    public_key TEXT NOT NULL,
    encrypted_private_key_backup TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Auth challenges table - temporary challenge storage
CREATE TABLE IF NOT EXISTS auth_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL,
    challenge_token VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP
);

-- Sessions table - track active sessions
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    auth_challenge_id UUID,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (auth_challenge_id) REFERENCES auth_challenges(id) ON DELETE SET NULL
);

-- Messages table - stores encrypted messages (zero-trust)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL,
    recipient_id UUID NOT NULL,
    encrypted_payload TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'message',
    delivered BOOLEAN DEFAULT FALSE,
    deleted_by_sender BOOLEAN DEFAULT FALSE,
    deleted_by_recipient BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP,
    expires_at TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Contacts table - manages user relationships
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    contact_user_id UUID NOT NULL,
    contact_alias VARCHAR(100),
    user_declared_verified BOOLEAN DEFAULT FALSE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, contact_user_id)
);

-- Audit events table - metadata only (zero-trust)
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    event_type VARCHAR(50) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Performance indexes
-- Message retrieval (with soft delete filtering)
CREATE INDEX IF NOT EXISTS idx_messages_recipient_time ON messages(recipient_id, created_at DESC) 
    WHERE deleted_by_recipient = FALSE;

CREATE INDEX IF NOT EXISTS idx_messages_recipient_delivered ON messages(recipient_id, delivered) 
    WHERE deleted_by_recipient = FALSE;

CREATE INDEX IF NOT EXISTS idx_messages_sender_time ON messages(sender_id, created_at DESC) 
    WHERE deleted_by_sender = FALSE;

-- Conversation queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, recipient_id, created_at DESC) 
    WHERE deleted_by_sender = FALSE AND deleted_by_recipient = FALSE;

-- Session management
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON sessions(user_id, expires_at) 
    WHERE expires_at > CURRENT_TIMESTAMP;

-- Contact lookups
CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_lookup ON contacts(user_id, contact_user_id);

-- Challenge cleanup
CREATE INDEX IF NOT EXISTS idx_challenges_expires ON auth_challenges(expires_at) 
    WHERE used = FALSE;

-- Audit queries
CREATE INDEX IF NOT EXISTS idx_audit_user_time ON audit_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_events(event_type, created_at DESC);

-- User lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Utility views for soft deletes
CREATE OR REPLACE VIEW active_messages AS
SELECT * FROM messages 
WHERE deleted_by_sender = FALSE AND deleted_by_recipient = FALSE;

CREATE OR REPLACE VIEW user_inbox AS
SELECT * FROM messages 
WHERE deleted_by_recipient = FALSE;

CREATE OR REPLACE VIEW user_sent AS
SELECT * FROM messages 
WHERE deleted_by_sender = FALSE;

-- Cleanup function for expired challenges
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

-- Comments for zero-trust documentation
COMMENT ON TABLE messages IS 'Stores encrypted message payloads - server never sees plaintext';
COMMENT ON COLUMN messages.encrypted_payload IS 'Opaque encrypted blob - server does not interpret content';
COMMENT ON COLUMN contacts.user_declared_verified IS 'User-declared trust flag - not cryptographically enforced by server';
COMMENT ON TABLE audit_events IS 'Metadata-only audit log - never stores sensitive content or keys';