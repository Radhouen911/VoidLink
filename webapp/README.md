# VoidLink Web Application

Base structure for the VoidLink secure messaging web application.

## Project Structure

```
webapp/
├── client/          # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
└── server/          # Node.js backend
    ├── src/
    │   ├── database/
    │   ├── routes/
    │   └── server.js
    └── package.json
```

## Quick Start with Docker (Recommended)

### Prerequisites

- Docker and Docker Compose installed
- Git

### One-Command Setup

```bash
# Clone and start everything
git clone <repository-url>
cd webapp
chmod +x scripts/dev-setup.sh
./scripts/dev-setup.sh
```

### Manual Docker Setup

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Services

- **Frontend**: http://localhost:3000 (React + Vite)
- **Backend**: http://localhost:5000 (Node.js + Express)
- **Database**: localhost:5432 (PostgreSQL)

## Local Development (Without Docker)

### Frontend (React)

```bash
cd webapp/client
npm install
npm run dev
```

### Backend (Node.js)

```bash
cd webapp/server
npm install
npm run init-db  # Initialize database
npm run dev
```

Runs on http://localhost:5000

## Database Schema (Zero-Trust Design)

### Core Principles

- **UUIDs**: All primary keys use UUIDs to prevent enumeration attacks
- **Opaque Payloads**: Server stores encrypted blobs without interpretation
- **Soft Deletes**: Messages support soft deletion for better delivery guarantees
- **Metadata Only**: Audit logs contain no sensitive content or keys

### Tables Overview

#### Users Table

- `id` (UUID) - Primary key
- `username` - Unique username for routing
- `public_key` - User's public key for encryption
- `encrypted_private_key_backup` - Optional encrypted backup (user choice)
- Timestamps for creation and last activity

#### Messages Table (Zero-Trust Core)

- `id` (UUID) - Primary key
- `sender_id`, `recipient_id` - User references
- `encrypted_payload` - **Opaque encrypted blob** (server never interprets)
- `message_type` - Routing hint ('message', 'rekey', 'session_key')
- `delivered`, `deleted_by_sender`, `deleted_by_recipient` - State flags
- `expires_at` - Optional TTL for forward secrecy

#### Sessions Table

- `id` (UUID) - Primary key
- `user_id` - User reference
- `session_token` - Authentication token
- `auth_challenge_id` - Reference to used challenge
- Expiration and activity timestamps

#### Contacts Table

- `id` (UUID) - Primary key
- `user_id`, `contact_user_id` - User relationships
- `user_declared_verified` - **Client-side trust flag** (not server-enforced)
- Contact alias and metadata

#### Auth Challenges Table

- Temporary storage for authentication challenges
- 5-minute expiration with auto-cleanup
- Prevents replay attacks

#### Audit Events Table

- **Metadata-only logging** (no sensitive content)
- Event types, timestamps, IP addresses
- JSONB field for additional context

### Performance Features

- Filtered indexes for active (non-deleted) messages
- Composite indexes for conversation queries
- Optimized inbox/outbox retrieval
- Automatic cleanup functions

## API Endpoints (Zero-Trust Design)

### Authentication

- `POST /api/auth/register` - Register user with public key
- `POST /api/auth/challenge` - Get cryptographic challenge for login
- `POST /api/auth/verify` - Verify signed challenge response
- `POST /api/auth/logout` - Invalidate session token
- `GET /api/auth/session` - Validate current session

### Users

- `GET /api/users/:username` - Get user's public key
- `GET /api/users/search?q=query` - Search users by username
- `PUT /api/users/profile` - Update user metadata (last_seen, etc.)

### Messages (Opaque Payload Handling)

- `POST /api/messages/relay` - Send encrypted message/session key/rekey (server treats all as opaque blobs)
- `GET /api/messages/conversation/:username?since=timestamp&limit=50` - Get conversation history with explicit pagination
- `GET /api/messages/inbox?limit=50&offset=0` - Get encrypted messages for user
- `PATCH /api/messages/:id/delivered` - Mark message as delivered
- `DELETE /api/messages/:id` - Soft delete message (user-specific)

### Contacts (User-Declared Trust)

- `POST /api/contacts/add` - Add user to contacts
- `GET /api/contacts` - Get user's contact list
- `PUT /api/contacts/:id/trust-status` - Update user-declared verification status
- `DELETE /api/contacts/:id` - Remove contact

### Key Management (Optional Cloud Backup)

- `POST /api/keys/backup` - Store encrypted private key backup
- `GET /api/keys/backup` - Retrieve encrypted private key backup
- `DELETE /api/keys/backup` - Remove key backup from server

### Security & Monitoring (Metadata Only)

- `GET /api/security/sessions` - List active sessions
- `DELETE /api/security/sessions/:id` - Revoke specific session
- `GET /api/security/events?limit=100` - Get security audit log (metadata only)

### Health & Status

- `GET /api/health` - Service health check
- `GET /api/metrics` - Basic usage metrics (non-sensitive)

### WebSocket Events (Real-time)

- `message_received` - New encrypted message notification
- `user_online` / `user_offline` - Contact status updates
- `typing_indicator` - Contact typing status
- `delivery_confirmation` - Message delivered confirmation

## Zero-Trust API Principles

### Server Behavior

- **Opaque Payloads**: All encrypted content treated as uninterpretable blobs
- **No Validation**: Server never validates or processes encrypted content
- **Store & Forward**: Pure message routing without content inspection
- **Metadata Only**: Logs events and routing info, never sensitive data

### Client Responsibilities

- **All Crypto**: Key generation, encryption, decryption, signature verification
- **Trust Decisions**: Contact verification is client-side only
- **Content Ordering**: Client handles message ordering and conversation state
- **Key Management**: Private keys never leave client (except in encrypted backups)

## Development Notes

This is the **base structure** for team development. Each developer should:

1. **Frontend Team**: Implement crypto module, UI components, and user flows
2. **Backend Team**: Complete authentication, WebSocket messaging, and security features
3. **Security Team**: Implement proper cryptographic functions and key management

## TODO for Development Teams

### Frontend

- [ ] Implement crypto module (key generation, encryption/decryption)
- [ ] Add proper authentication flow
- [ ] Build chat interface with real-time messaging
- [ ] Implement key backup/restore functionality

### Backend

- [ ] Complete challenge-response authentication
- [ ] Implement WebSocket message routing
- [ ] Add proper session management
- [ ] Implement message queuing for offline users

### Security

- [ ] Implement proper signature verification
- [ ] Add key rotation mechanisms
- [ ] Implement forward secrecy
- [ ] Add security headers and rate limiting
