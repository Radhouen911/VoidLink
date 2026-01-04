# VoidLink Web Application

Base structure for the VoidLink secure messaging web application.

## Project Structure

```
webapp/
├── Client/          # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
└── Server/          # Node.js backend
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
cd webapp/Client
npm install
npm run dev
```

### Backend (Node.js)

```bash
cd webapp/Server
npm install
npm run init-db  # Initialize database
npm run dev
```

Runs on http://localhost:5000

## Database Schema (Two-Layer Authentication Design)

### Core Architecture

VoidLink implements a **two-layer security model** that separates account management from cryptographic operations:

#### **Layer 1: Account Security (Traditional)**

- **Username/password authentication** for account access
- **Session management** for account operations (24-hour duration)
- **Account-level permissions** and settings

#### **Layer 2: Crypto Security (Zero-Trust)**

- **Challenge-response authentication** using Ed25519 signatures
- **Cryptographic sessions** for message operations (15-minute duration)
- **Zero-trust principle** - server never sees private keys

### Database Tables Overview

#### **Account Management Layer**

- **`accounts`** - Traditional user accounts (username, password_hash)
- **`account_sessions`** - Account session tokens with IP tracking

#### **Cryptographic Layer**

- **`crypto_profiles`** - Cryptographic identity linked to accounts (1:1 relationship)
- **`crypto_sessions`** - Challenge-response session tokens (requires account session)
- **`auth_challenges`** - Temporary cryptographic challenges (5-minute expiry)

#### **Application Data**

- **`messages`** - Encrypted message payloads (linked to crypto profiles)
- **`contacts`** - User relationships (linked to crypto profiles)
- **`audit_events`** - Security and activity logging with event categories

### Security Features

- **UUIDs**: All primary keys use UUIDs to prevent enumeration attacks
- **Opaque Payloads**: Server stores encrypted blobs without interpretation
- **Soft Deletes**: Messages support soft deletion for better delivery guarantees
- **Cascading Security**: Account deletion removes all associated crypto data
- **Session Hierarchy**: Crypto operations require valid account sessions
- **Audit Categories**: Comprehensive logging of security, account, crypto, and messaging events

### Key Relationships

```
Account (1) → Crypto Profile (1)
Account Session (1) → Crypto Sessions (N)
Crypto Profile (1) → Messages/Contacts (N)
```

### Performance Optimizations

- Filtered indexes for active sessions and messages
- Composite indexes for conversation queries
- Automatic cleanup functions for expired data
- Optimized views for common queries (`accounts_with_crypto`, `active_messages`)

## API Endpoints (Two-Layer Authentication Design)

### Layer 1: Account Management (Traditional Authentication)

#### Account Registration & Login

- `POST /api/auth/register` - Register account with username/password
- `POST /api/auth/login` - Login with username/password → account session
- `POST /api/auth/logout` - Invalidate account session
- `GET /api/auth/session` - Validate current account session

### Layer 2: Crypto Management (Requires Account Session)

#### Crypto Profile Setup

- `POST /api/auth/crypto/upload-key` - Upload public key to account
- `POST /api/auth/crypto/enable-backup` - Enable cloud backup of encrypted private key
- `POST /api/auth/crypto/disable-backup` - Disable cloud backup
- `PUT /api/auth/crypto/update-backup` - Update encrypted private key backup
- `GET /api/auth/crypto/fetch-backup` - Retrieve encrypted private key backup

#### Crypto Authentication (Challenge-Response)

- `POST /api/auth/crypto/challenge` - Get cryptographic challenge
- `POST /api/auth/crypto/verify` - Verify signed challenge → crypto session

### Layer 3: Application Operations (Requires Account + Crypto Sessions)

#### User Discovery

- `GET /api/users/:username` - Get user's public key (requires account session)
- `GET /api/users/search?q=query` - Search users by username (requires account session)

#### Messaging (Opaque Payload Handling)

- `POST /api/messages/send` - Send encrypted message (opaque blob)
- `GET /api/messages/conversation/:username?since=timestamp&limit=50` - Get conversation history
- `GET /api/messages/inbox?limit=50&offset=0&undelivered_only=false` - Get encrypted messages
- `PATCH /api/messages/:id/delivered` - Mark message as delivered
- `DELETE /api/messages/:id` - Soft delete message

#### Contacts (User-Declared Trust)

- `POST /api/contacts/add` - Add user to contacts
- `GET /api/contacts` - Get contact list
- `PUT /api/contacts/:id/trust-status` - Update verification status (user-declared)
- `DELETE /api/contacts/:id` - Remove contact

### Security & Monitoring

#### Session Management

- `GET /api/security/sessions` - List active account sessions
- `DELETE /api/security/sessions/:id` - Revoke specific session
- `GET /api/security/crypto-sessions` - List active crypto sessions

#### Audit & Monitoring

- `GET /api/security/events?category=security&limit=100` - Get audit log
- `GET /api/health` - Service health check

### WebSocket Events (Real-time - Requires Crypto Session)

- `message_received` - New encrypted message notification
- `user_online` / `user_offline` - Contact status updates
- `typing_indicator` - Contact typing status
- `delivery_confirmation` - Message delivered confirmation

## Authentication Flow Examples

### Complete User Onboarding

```bash
# 1. Create account
POST /api/auth/register {"username": "alice", "password": "secure123"}

# 2. Login to account
POST /api/auth/login {"username": "alice", "password": "secure123"}
# Returns: account_session_token

# 3. Upload crypto keys (requires account session)
POST /api/auth/crypto/upload-key
Headers: Authorization: Bearer <account_session_token>
Body: {"publicKey": "ed25519_public_key_hex"}

# 4. Enable cloud backup (optional)
POST /api/auth/crypto/enable-backup
Headers: Authorization: Bearer <account_session_token>
Body: {"encryptedPrivateKey": "encrypted_private_key_blob"}

# 5. Crypto authentication for messaging
POST /api/auth/crypto/challenge
Headers: Authorization: Bearer <account_session_token>
# Returns: challenge

POST /api/auth/crypto/verify
Headers: Authorization: Bearer <account_session_token>
Body: {"challenge": "...", "signature": "ed25519_signature"}
# Returns: crypto_session_token

# 6. Send messages (requires both sessions)
POST /api/messages/send
Headers:
  Authorization: Bearer <account_session_token>
  X-Crypto-Session: <crypto_session_token>
Body: {"recipient": "bob", "encryptedPayload": "..."}
```

## Two-Layer Security Model

### Authentication Layers

#### **Layer 1: Account Security (Traditional)**

- **Purpose**: Account access and management
- **Method**: Username/password authentication
- **Session Duration**: 24 hours
- **Scope**: Account operations, key management, settings

#### **Layer 2: Crypto Security (Zero-Trust)**

- **Purpose**: Cryptographic operations and messaging
- **Method**: Ed25519 challenge-response authentication
- **Session Duration**: 15 minutes (sliding window)
- **Scope**: Message sending/receiving, contact operations

### Security Principles

#### **Server Behavior**

- **Account Layer**: Traditional password hashing and session management
- **Crypto Layer**: Opaque payload handling, no private key access
- **No Validation**: Server never validates or processes encrypted content
- **Store & Forward**: Pure message routing without content inspection
- **Metadata Only**: Logs events and routing info, never sensitive data

#### **Client Responsibilities**

- **Account Management**: Password security, session handling
- **All Crypto**: Key generation, encryption, decryption, signature verification
- **Trust Decisions**: Contact verification is client-side only
- **Content Ordering**: Client handles message ordering and conversation state
- **Key Management**: Private keys never leave client (except in encrypted backups)

### Session Management

- **Account sessions** enable crypto key management
- **Crypto sessions** enable message operations
- **Hierarchical security**: Crypto sessions require valid account sessions
- **Independent expiration**: Account and crypto sessions expire separately

## Development Notes

This is the **base structure** for team development. Each developer should:

1. **Frontend Team**: Implement crypto module, UI components, and user flows
2. **Backend Team**: Complete authentication, WebSocket messaging, and security features
3. **Security Team**: Implement proper cryptographic functions and key management

## Status

**Production Ready** ✅

### Completed Features

**Authentication & Security:**

- ✅ Two-layer authentication (Account + Crypto sessions)
- ✅ Ed25519 challenge-response authentication
- ✅ Passphrase-encrypted private keys
- ✅ Cloud backup for multi-device support
- ✅ Session persistence across page refresh
- ✅ Automatic session expiry handling
- ✅ Rate limiting on auth endpoints
- ✅ Comprehensive audit logging

**Messaging:**

- ✅ End-to-end encryption (Ed25519 + Curve25519 + NaCl)
- ✅ Real-time messaging via WebSocket
- ✅ Offline message queue with auto-delivery
- ✅ Message history with infinite scroll
- ✅ Read receipts (⏱ ✓ ✓✓)
- ✅ Delivery confirmations
- ✅ Zero polling - 100% WebSocket

**Contacts:**

- ✅ Contact request system (send/accept/reject)
- ✅ WebSocket notifications for contact requests
- ✅ Online/offline presence indicators
- ✅ Manual presence status (Online/Away/Busy)
- ✅ Typing indicators

**User Experience:**

- ✅ Modern glassmorphism UI design
- ✅ Responsive layout
- ✅ Smooth animations and transitions
- ✅ Toast notifications
- ✅ Loading states and error handling
- ✅ Auto-scroll to new messages

### Recent Updates

**Session Management:**

- Fixed session expiry on refresh
- Passphrase stored in sessionStorage for key restoration
- AuthContext for global auth state management
- Automatic logout on 401 with redirect

**Message System:**

- Infinite scroll (30 messages per load)
- Scroll to top loads older messages
- Maintains scroll position when loading more
- Removed "message sent" toast

**UI/UX:**

- Glassmorphism design with backdrop blur
- Gradient buttons and animations
- Enhanced scrollbar with gradients
- Animated background
- Hover effects with scale transforms

**Real-Time:**

- Zero polling achieved
- WebSocket for all updates
- Contact request notifications
- Message delivery/read confirmations
- Presence updates
- Typing indicators

### Architecture

**Frontend:**

- React 18 + TypeScript + Vite
- Zustand for state management
- TailwindCSS for styling
- TweetNaCl.js + ed2curve for crypto
- Native WebSocket API

**Backend:**

- Node.js + Express
- PostgreSQL database
- WebSocket server
- Message queue system
- Two-layer authentication

**Security:**

- Zero-trust architecture
- Private keys always encrypted
- Server cannot decrypt messages
- Two-layer authentication
- Session expiry enforcement

### Performance

- Zero polling (0 background requests)
- WebSocket for real-time updates
- Efficient message loading (30 at a time)
- Automatic cleanup of old data
- Optimized database queries

## 🔒 Security Implementation Details

### Ed25519 Cryptographic Authentication

- **Library**: TweetNaCl for Ed25519 signature verification
- **Key Format**: 64-character hex strings (32 bytes)
- **Challenge**: 64-character hex random challenge (32 bytes)
- **Signature**: 128-character hex signature (64 bytes)

### Rate Limiting Protection

- **Challenge Endpoint**: 5 requests per minute per IP+username combination
- **Memory Store**: In-memory rate limiting (use Redis in production)
- **Response**: 429 status with retry-after header

### Security Hardening

- ✅ **No Public Key Leakage**: Challenge endpoint doesn't return public keys
- ✅ **Real Signature Verification**: Ed25519 cryptographic verification
- ✅ **Failed Login Logging**: Security audit trail for failed attempts
- ✅ **Challenge Expiration**: 5-minute challenge window
- ✅ **Session Timeout**: 15-minute automatic session expiration
- ✅ **Input Validation**: Username format and public key validation

## Testing the Two-Layer Authentication System

### Complete Flow Test (Recommended)

Run the comprehensive Node.js test that includes real Ed25519 cryptography:

```bash
# Start the application
docker-compose up -d

# Wait for services to be ready, then run the test
cd webapp/Server
npm install  # if not already done
node test/test-complete-flow.js
```

This test verifies:

- Account registration and login
- Public key upload and crypto profile creation
- Challenge-response authentication with real Ed25519 signatures
- Crypto session management
- Message system integration
- Session validation and logout

### Quick API Test

For a quick verification that endpoints are responding:

**Linux/Mac:**

```bash
cd webapp
./scripts/test-api.sh
```

**Windows:**

```bash
cd webapp
scripts\test-api.bat
```

### Manual Testing with Postman

Use the test data from `webapp/server/test/test-complete-flow.js` to manually test the API endpoints with Postman or similar tools.
