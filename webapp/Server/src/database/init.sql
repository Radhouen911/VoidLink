-- VoidLink Database Schema - Tables Only
-- Simplified version with just table creation statements

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    account_status VARCHAR(20) DEFAULT 'active',
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. ACCOUNT SESSIONS TABLE
CREATE TABLE IF NOT EXISTS account_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. CRYPTO PROFILES TABLE
CREATE TABLE IF NOT EXISTS crypto_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID UNIQUE NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    public_key TEXT NOT NULL,
    key_algorithm VARCHAR(50) DEFAULT 'RSA-OAEP',
    cloud_backup_enabled BOOLEAN DEFAULT FALSE,
    encrypted_private_key_backup TEXT,
    key_uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    backup_created_at TIMESTAMP WITH TIME ZONE,
    backup_updated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. CRYPTO SESSIONS TABLE
CREATE TABLE IF NOT EXISTS crypto_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_session_id UUID NOT NULL REFERENCES account_sessions(id) ON DELETE CASCADE,
    crypto_profile_id UUID NOT NULL REFERENCES crypto_profiles(id) ON DELETE CASCADE,
    crypto_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. AUTH CHALLENGES TABLE
CREATE TABLE IF NOT EXISTS auth_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_session_id UUID NOT NULL REFERENCES account_sessions(id) ON DELETE CASCADE,
    crypto_profile_id UUID NOT NULL REFERENCES crypto_profiles(id) ON DELETE CASCADE,
    challenge_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. CONTACTS TABLE
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_crypto_id UUID NOT NULL REFERENCES crypto_profiles(id) ON DELETE CASCADE,
    contact_crypto_id UUID NOT NULL REFERENCES crypto_profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    contact_status VARCHAR(20) DEFAULT 'pending',
    contact_alias VARCHAR(100),
    user_declared_verified BOOLEAN DEFAULT FALSE,
    request_message TEXT,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP WITH TIME ZONE,
    last_interaction TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(owner_crypto_id, contact_crypto_id)
);

-- 7. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_crypto_id UUID NOT NULL REFERENCES crypto_profiles(id) ON DELETE CASCADE,
    recipient_crypto_id UUID NOT NULL REFERENCES crypto_profiles(id) ON DELETE CASCADE,
    encrypted_payload TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'message',
    delivered BOOLEAN DEFAULT FALSE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    deleted_by_sender BOOLEAN DEFAULT FALSE,
    deleted_by_recipient BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. MESSAGE QUEUE TABLE
CREATE TABLE IF NOT EXISTS message_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    recipient_crypto_id UUID NOT NULL REFERENCES crypto_profiles(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    processed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. USER PRESENCE TABLE
CREATE TABLE IF NOT EXISTS user_presence (
    crypto_profile_id UUID PRIMARY KEY REFERENCES crypto_profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'offline',
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    connection_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. AUDIT EVENTS TABLE
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    crypto_profile_id UUID REFERENCES crypto_profiles(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    event_category VARCHAR(50) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- Helper function to check if two users are contacts
CREATE OR REPLACE FUNCTION are_contacts(crypto_id_1 UUID, crypto_id_2 UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM contacts 
        WHERE (owner_crypto_id = crypto_id_1 AND contact_crypto_id = crypto_id_2)
           OR (owner_crypto_id = crypto_id_2 AND contact_crypto_id = crypto_id_1)
    );
END;
$$ LANGUAGE plpgsql;

-- Helper function to get queued messages for a user
CREATE OR REPLACE FUNCTION get_queued_messages(recipient_id UUID)
RETURNS TABLE (
    queue_id UUID,
    message_id UUID,
    sender_crypto_id UUID,
    encrypted_payload TEXT,
    message_type VARCHAR(50),
    priority INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mq.id as queue_id,
        m.id as message_id,
        m.sender_crypto_id,
        m.encrypted_payload,
        m.message_type,
        mq.priority,
        m.created_at
    FROM message_queue mq
    INNER JOIN messages m ON mq.message_id = m.id
    WHERE mq.recipient_crypto_id = recipient_id
      AND mq.processed_at IS NULL
      AND mq.failed_at IS NULL
    ORDER BY mq.priority DESC, mq.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Cleanup function for expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM crypto_sessions WHERE expires_at < CURRENT_TIMESTAMP;
    DELETE FROM account_sessions WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Cleanup function for expired challenges
CREATE OR REPLACE FUNCTION cleanup_expired_challenges()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM auth_challenges WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;


-- Helper function to get contact status between two users
CREATE OR REPLACE FUNCTION get_contact_status(crypto_id_1 UUID, crypto_id_2 UUID)
RETURNS TABLE (
    relationship_status VARCHAR(20),
    contact_id UUID,
    is_owner BOOLEAN
) AS $$
DECLARE
    result_count INTEGER;
    accepted_count INTEGER;
BEGIN
    -- Check if any relationship exists
    SELECT COUNT(*) INTO result_count
    FROM contacts c
    WHERE (c.owner_crypto_id = crypto_id_1 AND c.contact_crypto_id = crypto_id_2)
       OR (c.owner_crypto_id = crypto_id_2 AND c.contact_crypto_id = crypto_id_1);
    
    IF result_count = 0 THEN
        RETURN QUERY SELECT 'none'::VARCHAR(20), NULL::UUID, FALSE::BOOLEAN;
    ELSE
        -- Check if both sides are accepted (mutual)
        SELECT COUNT(*) INTO accepted_count
        FROM contacts c
        WHERE ((c.owner_crypto_id = crypto_id_1 AND c.contact_crypto_id = crypto_id_2)
            OR (c.owner_crypto_id = crypto_id_2 AND c.contact_crypto_id = crypto_id_1))
          AND c.contact_status = 'accepted';
        
        IF accepted_count > 0 THEN
            RETURN QUERY SELECT 'mutual'::VARCHAR(20), c.id as contact_id, (c.owner_crypto_id = crypto_id_1) as is_owner
            FROM contacts c
            WHERE (c.owner_crypto_id = crypto_id_1 AND c.contact_crypto_id = crypto_id_2)
               OR (c.owner_crypto_id = crypto_id_2 AND c.contact_crypto_id = crypto_id_1)
            LIMIT 1;
        ELSE
            RETURN QUERY
            SELECT 
                c.status as relationship_status,
                c.id as contact_id,
                (c.owner_crypto_id = crypto_id_1) as is_owner
            FROM contacts c
            WHERE (c.owner_crypto_id = crypto_id_1 AND c.contact_crypto_id = crypto_id_2)
               OR (c.owner_crypto_id = crypto_id_2 AND c.contact_crypto_id = crypto_id_1)
            LIMIT 1;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;


-- Helper function to get pending contact requests
CREATE OR REPLACE FUNCTION get_pending_contact_requests(user_crypto_id UUID)
RETURNS TABLE (
    contact_id UUID,
    requester_crypto_id UUID,
    requester_username VARCHAR(50),
    requester_public_key TEXT,
    request_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as contact_id,
        c.owner_crypto_id as requester_crypto_id,
        a.username as requester_username,
        cp.public_key as requester_public_key,
        c.request_message,
        c.created_at
    FROM contacts c
    INNER JOIN crypto_profiles cp ON c.owner_crypto_id = cp.id
    INNER JOIN accounts a ON cp.account_id = a.id
    WHERE c.contact_crypto_id = user_crypto_id
      AND c.contact_status = 'pending'
    ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Helper function to get contacts with presence information
CREATE OR REPLACE FUNCTION get_contacts_with_presence(user_crypto_id UUID)
RETURNS TABLE (
    contact_crypto_id UUID,
    username VARCHAR(50),
    public_key TEXT,
    key_algorithm VARCHAR(50),
    contact_status VARCHAR(20),
    presence_status VARCHAR(20),
    last_seen TIMESTAMP WITH TIME ZONE,
    is_online BOOLEAN,
    added_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.contact_crypto_id,
        a.username,
        cp.public_key,
        cp.key_algorithm,
        c.contact_status,
        COALESCE(up.status, 'offline') as presence_status,
        up.last_seen,
        COALESCE(up.connection_count > 0 AND up.status != 'offline', FALSE) as is_online,
        c.added_at
    FROM contacts c
    INNER JOIN crypto_profiles cp ON c.contact_crypto_id = cp.id
    INNER JOIN accounts a ON cp.account_id = a.id
    LEFT JOIN user_presence up ON c.contact_crypto_id = up.crypto_profile_id
    WHERE c.owner_crypto_id = user_crypto_id
      AND c.contact_status = 'accepted'
    ORDER BY is_online DESC, a.username ASC;
END;
$$ LANGUAGE plpgsql;
