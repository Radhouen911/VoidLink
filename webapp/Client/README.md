# VoidLink Frontend

**Zero-trust end-to-end encrypted messaging application**

## Features

✅ **Complete & Working:**

- End-to-end encryption with Ed25519 + NaCl
- Mandatory passphrase encryption for private keys
- Multi-device support via encrypted cloud backup
- User registration and login
- Contact management (send/accept/reject requests)
- Real-time messaging
- Online/offline presence indicators
- Toast notifications for all actions
- Responsive UI with dark "void" theme

## Quick Start

### Run with Docker Compose

```bash
cd webapp
docker compose up --build
```

**Access the app:**

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Environment Variables

The `.env` file is already configured:

```env
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000/ws
```

## How to Use

### 1. Register an Account

- Navigate to http://localhost:3000
- Click "Register"
- Enter username, password, and passphrase
- **Important**: Your passphrase encrypts your private key - don't lose it!

### 2. Add Contacts

- After login, click "+ Add Contact"
- Enter the username of another registered user
- Optional: Add a message with your request
- The other user will see your request in their "Pending Requests" section

### 3. Accept Contact Requests

- Pending requests appear at the top of the contacts sidebar
- Click "Accept" to add them as a contact
- Both users can now message each other

### 4. Send Messages

- Click on a contact in the sidebar
- Type your message in the input field at the bottom
- Press Enter or click "Send"
- Messages are encrypted end-to-end

## Architecture

### Security Model

- **Two-layer authentication**: Account (username/password) + Crypto (challenge-response)
- **Private keys**: Always encrypted with passphrase, never stored in plaintext
- **Session security**: Decrypted private key cached in memory during session (cleared on logout/refresh)
- **Cloud backup**: Encrypted private key stored on server for multi-device access
- **Zero-trust**: Server cannot decrypt messages or keys

### Messaging Flow

1. **Key Exchange**: When users become contacts, their public keys are exchanged automatically
2. **Message Encryption**:
   - Sender encrypts message with recipient's public key using their own private key
   - Uses NaCl box (Curve25519-XSalsa20-Poly1305) authenticated encryption
   - Creates JSON payload: `{nonce: base64, encrypted: base64}`
3. **Message Transmission**: Encrypted payload sent to server via REST API or WebSocket
4. **Message Delivery**:
   - Real-time delivery if recipient is online (via WebSocket)
   - Queued delivery if recipient is offline (delivered on next login)
5. **Message Decryption**:
   - Recipient decrypts with their private key and sender's public key
   - Only recipient can decrypt (end-to-end encryption)

### Key Format

- **Public Keys**: 64-character hex string (Ed25519, 32 bytes)
- **Private Keys**: 128-character hex string (Ed25519, 64 bytes)
- **Encrypted Keys**: Base64-encoded NaCl secretbox (passphrase-encrypted)
- **Message Payloads**: JSON with base64-encoded nonce and ciphertext

### Tech Stack

- **Framework**: React 18 + TypeScript + Vite
- **Routing**: React Router v6
- **State**: Zustand
- **Styling**: Tailwind CSS
- **Crypto**: TweetNaCl.js (Ed25519 + NaCl box) + ed2curve (key conversion)
- **Real-time**: Native WebSocket API
- **Container**: Docker + nginx

### Project Structure

```
Client/src/
├── components/common/    # Reusable UI components
├── crypto/              # Cryptography utilities
│   ├── keyManagement.ts # Key generation, backup, import
│   ├── signing.ts       # Ed25519 signatures
│   ├── encryption.ts    # NaCl box encryption
│   └── storage.ts       # Secure localStorage wrapper
├── services/
│   ├── api.ts          # REST API client
│   ├── auth.ts         # Authentication service
│   └── websocket.ts    # WebSocket client
├── store/              # Zustand state management
│   ├── authStore.ts    # Authentication state
│   ├── chatStore.ts    # Messages and conversations
│   └── contactStore.ts # Contacts and requests
├── hooks/              # React hooks
│   ├── useAuth.ts      # Authentication hook
│   ├── useWebSocket.ts # WebSocket hook
│   └── useCrypto.ts    # Crypto operations hook
└── pages/              # Page components
    ├── Landing.tsx     # Landing page
    ├── Register.tsx    # Registration with key generation
    ├── Login.tsx       # Login with passphrase
    ├── Chat.tsx        # Main chat interface
    └── NotFound.tsx    # 404 page
```

## Key Features Explained

### Passphrase-Based Encryption

- Your passphrase encrypts your private key using NaCl secretbox
- Private key is encrypted both locally and in cloud backup
- Only you know your passphrase - it's never sent to the server
- If you lose your passphrase, you cannot recover your account

### Multi-Device Support

- Login from any device with username + password + passphrase
- Encrypted private key is fetched from server and decrypted locally
- Keys are only decrypted temporarily in memory for crypto operations

### Contact System

- Send contact requests to other users by username
- Requests must be accepted before messaging
- Both users see each other's online/offline status
- Public keys are exchanged automatically

### Message Encryption

- Each message is encrypted with recipient's public key using sender's private key
- Uses NaCl box (Curve25519 + XSalsa20 + Poly1305) authenticated encryption
- Server only sees encrypted payloads (base64-encoded JSON)
- Only recipient can decrypt with their private key
- Private key is cached in memory during session for seamless messaging
- Private key is cleared on logout or page refresh (requires re-login)

### Real-Time Features

- WebSocket connection for instant message delivery
- Online/offline presence indicators
- Typing indicators (backend supported, frontend ready)
- Message delivery confirmations

## API Integration

### REST Endpoints Used

- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login to account
- `POST /api/auth/crypto/upload-key` - Upload public key
- `POST /api/auth/crypto/challenge` - Get crypto challenge
- `POST /api/auth/crypto/verify` - Verify challenge signature
- `POST /api/auth/crypto/enable-backup` - Enable cloud backup
- `GET /api/auth/crypto/fetch-backup` - Fetch encrypted backup
- `POST /api/contacts/request` - Send contact request
- `GET /api/contacts/requests/pending` - Get pending requests
- `POST /api/contacts/:id/accept` - Accept contact request
- `POST /api/contacts/:id/reject` - Reject contact request
- `GET /api/contacts` - Get contacts list with presence
- `POST /api/messages/send` - Send encrypted message

### WebSocket Events

- `new_message` - Incoming message
- `message_delivered` - Delivery confirmation
- `presence_update` - User online/offline status
- `typing_indicator` - User typing status

## Development

### Build for Production

```bash
npm run build
```

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

## Troubleshooting

### Messages Not Sending

- Ensure both users have accepted the contact request
- Check that contact's public key is available (visible in console logs)
- Verify you're logged in (session may expire after 15 minutes)
- If "Session expired" error appears, login again to refresh the session
- Check browser console for detailed error messages

### Session Expired

- Crypto sessions expire after 15 minutes
- Simply login again to get a new session
- Account sessions last 24 hours

### Can't See Contact Requests

- Requests appear in "Pending Requests" section at top of sidebar
- Only visible to the user who received the request
- Refresh the page if requests don't appear

### Online Status Not Updating

- Online status updates via WebSocket
- Check that WebSocket is connected (green dot in header)
- Status updates when users login/logout

## Security Notes

⚠️ **Critical Security Information:**

1. **Passphrase is mandatory** - You cannot recover your account without it
2. **Private keys are always encrypted** - Never stored in plaintext anywhere
3. **Server cannot decrypt** - Zero-knowledge architecture
4. **Backup your passphrase** - Write it down securely
5. **Use strong passphrases** - Minimum 8 characters, use a mix of characters

## Status

**Production Ready** ✅

- All core features implemented and working
- Authentication flow complete with passphrase encryption
- Contact management functional (send/accept/reject requests)
- **Messaging system operational with proper end-to-end encryption**
- Real-time features active (WebSocket, presence, typing indicators)
- Error handling comprehensive with user-friendly toast notifications
- UI polished and responsive with dark "void" theme

### Recent Fixes (Latest)

- ✅ Backend now returns `publicKey` in contacts list response
- ✅ Frontend uses proper NaCl box encryption with sender's private key
- ✅ **FIXED: Ed25519 to Curve25519 key conversion** using `ed2curve` library
  - Backend stores Ed25519 signing keys (for authentication)
  - NaCl box encryption requires Curve25519 keys
  - Added `ed2curve` package for proper key conversion
  - Both encryption and decryption now use standard Ed25519→Curve25519 conversion
  - Messages now encrypt and decrypt successfully!
- ✅ Private key cached in memory during session for seamless messaging
- ✅ **Messages now load from server** on conversation open
- ✅ **Messages decrypt automatically** when displayed
- ✅ **Fixed conversation history mapping** - correctly handles backend's `direction` field
- ✅ **Fixed WebSocket message handling** - matches backend's actual message format
- ✅ **Changed message sending from REST API to WebSocket** for real-time delivery
- ✅ Encryption format matches backend expectations (base64 JSON payload)
- ✅ Fixed deprecated `onKeyPress` warning (now uses `onKeyDown`)
- ✅ Improved error messages for session expiration

### Integration Complete

The frontend now correctly integrates with the backend:

- Conversation history loads with proper `direction` field mapping
- Messages decrypt using correct sender/recipient public keys
- WebSocket messages handled according to backend format
- All API responses mapped correctly to frontend data structures

### Known Behavior

- **Session expires on refresh**: For security, the decrypted private key is only kept in memory. When you refresh the page, you must login again to decrypt messages.
- **Messages persist**: All messages are stored on the server and will load when you open a conversation (after logging in).

### Key Conversion

The system uses **Ed25519** keys for signing (authentication) but **Curve25519** keys for encryption (messaging). The `ed2curve` library provides standard conversion:

**How it works:**

- Backend stores Ed25519 keys (32-byte public key, 64-byte secret key)
- For encryption, Ed25519 keys are converted to Curve25519 using the standard algorithm
- Ed25519 public key (32 bytes) → Curve25519 public key (32 bytes)
- Ed25519 secret key seed (first 32 bytes) → Curve25519 secret key (32 bytes)
- This is a deterministic, one-way conversion that preserves key relationships
- Both parties can independently convert their keys and still communicate

**Why this is needed:**

- Ed25519 is optimized for digital signatures (authentication)
- Curve25519 is optimized for Diffie-Hellman key exchange (encryption)
- They use different elliptic curve operations
- Cannot use Ed25519 keys directly for NaCl box encryption
- The `ed2curve` library implements the standard conversion algorithm

This allows a single key pair to be used for both authentication and encryption without compromising security.

## License

MIT

---

## Backend API Reference

This section documents the complete VoidLink backend API for frontend integration.

### Authentication System

VoidLink uses a **two-layer authentication system**:

#### Layer 1: Account Authentication (Username/Password)

- **Duration**: 24 hours
- **Token**: Bearer token in `Authorization` header
- **Purpose**: User identity verification

**Endpoints:**

- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Get account session token
- `GET /api/auth/session` - Validate session
- `POST /api/auth/logout` - End session

**Login Response:**

```json
{
  "success": true,
  "data": {
    "accountSessionToken": "hex string (64 chars)",
    "accountId": "uuid",
    "username": "string",
    "expiresAt": "ISO timestamp (24h)"
  }
}
```

#### Layer 2: Cryptographic Authentication (Ed25519)

- **Duration**: 15 minutes
- **Token**: Custom header `X-Crypto-Session`
- **Purpose**: Prove possession of private key
- **Requires**: Valid account session first

**Flow:**

1. `POST /api/auth/crypto/upload-key` - Upload public key (64-char hex)
2. `POST /api/auth/crypto/challenge` - Get random challenge to sign
3. `POST /api/auth/crypto/verify` - Submit signature, get crypto session token

**Challenge/Verify:**

```json
// Challenge response
{
  "success": true,
  "data": {
    "challenge": "64-char hex (32 bytes random)",
    "expiresAt": "ISO timestamp (5 min)"
  }
}

// Verify request
{
  "challenge": "64-char hex",
  "signature": "128-char hex (Ed25519 signature)"
}

// Verify response
{
  "success": true,
  "data": {
    "cryptoSessionToken": "hex string (64 chars)",
    "cryptoProfileId": "uuid",
    "expiresAt": "ISO timestamp (15 min)"
  }
}
```

**Cloud Backup:**

- `POST /api/auth/crypto/enable-backup` - Store encrypted private key on server
- `GET /api/auth/crypto/fetch-backup` - Retrieve encrypted backup (for multi-device)

---

### Contact Management API

All contact endpoints require **both sessions** (account + crypto).

**Send Contact Request:**

```
POST /api/contacts/request
{
  "username": "string",
  "message": "optional"
}
→ Returns: { requestId, username, status: "pending", sentAt }
```

**Get Pending Requests:**

```
GET /api/contacts/requests/pending
→ Returns: {
  pendingRequests: [{
    requestId, requesterUsername, message, receivedAt
  }]
}
```

**Accept/Reject Request:**

```
POST /api/contacts/:requestId/accept
POST /api/contacts/:requestId/reject
```

**Get Contacts List:**

```
GET /api/contacts
→ Returns: {
  contacts: [{
    contactId, username, publicKey,  // ← publicKey included!
    status, addedAt, acceptedAt,
    presence: {
      status: "online|offline|away|busy",
      lastSeen, isOnline
    }
  }]
}
```

**Important:** The backend returns `publicKey` in the contacts list, which is needed for message encryption.

---

### Messaging API

All messaging endpoints require **both sessions**.

**Send Message:**

```
POST /api/messages/send
{
  "recipientUsername": "string",
  "encryptedPayload": "string (JSON with base64 nonce + encrypted)",
  "messageType": "message|file|system"
}
→ Returns: { messageId, sentAt, recipient, messageType }
```

**Get Conversation History:**

```
GET /api/messages/conversation/:username?limit=50&offset=0&since=<timestamp>
→ Returns: {
  conversation: [{
    messageId, encryptedPayload, messageType,
    direction: "sent|received",  // ← Not senderUsername!
    delivered, createdAt
  }],
  partner, totalMessages, hasMore
}
```

**Important:** Backend returns `direction` ("sent" or "received"), NOT `senderUsername` or public keys. Frontend must infer sender/recipient from direction.

**Get Inbox:**

```
GET /api/messages/inbox?limit=50&undelivered_only=false
→ Returns: {
  messages: [{
    messageId, encryptedPayload, messageType,
    delivered, senderUsername, createdAt
  }]
}
```

**Mark Delivered:**

```
PATCH /api/messages/:messageId/delivered
→ Returns: { messageId, deliveredAt }
```

---

### WebSocket Real-Time Messaging

**Connection:**

```
ws://localhost:5000/ws?account_token=<token>&crypto_token=<token>
```

**Welcome Message:**

```json
{
  "type": "welcome",
  "user": { username, cryptoProfileId, connectedAt },
  "server": { version, features }
}
```

**Send Message:**

```json
{
  "type": "message_send",
  "recipientUsername": "string",
  "recipientCryptoProfileId": "uuid",
  "encryptedPayload": "string",
  "messageType": "message"
}
```

**Receive Message:**

```json
{
  "type": "message_received",
  "messageId": "uuid",
  "senderUsername": "string",
  "senderCryptoProfileId": "uuid",
  "encryptedPayload": "string",
  "messageType": "string",
  "sentAt": "ISO timestamp",
  "fromQueue": false, // true if was offline-queued
  "priority": 0
}
```

**Typing Indicators:**

```json
// Send
{ "type": "typing_start", "recipientUsername": "string" }
{ "type": "typing_stop", "recipientUsername": "string" }

// Receive
{ "type": "typing_start|typing_stop", "senderUsername": "string" }
```

**Presence Updates:**

```json
// Send
{ "type": "presence_update", "status": "online|away|busy|offline" }

// Receive (from contacts)
{ "type": "presence_update", "cryptoProfileId": "uuid", "status": "online" }
```

**Delivery Confirmations:**

```json
// Send
{ "type": "message_delivered", "messageId": "uuid" }

// Receive
{ "type": "message_delivery_confirmed", "messageId": "uuid", "deliveredAt": "..." }
```

**Keep-Alive:**

```json
// Send
{ "type": "ping" }

// Receive
{ "type": "pong", "timestamp": "...", "serverTime": 123456 }
```

---

### Offline Message Queue

**How It Works:**

- Messages to offline users are automatically queued in database
- Queue processed every 10 seconds
- When user comes online, queued messages delivered immediately via WebSocket
- Messages marked as delivered after successful delivery
- Old processed messages cleaned up after 24 hours

**Queue Behavior:**

- Messages delivered in priority order (highest first)
- Within same priority, oldest messages first (FIFO)
- Failed messages retry up to 3 times
- Delivery confirmations sent via WebSocket

---

### Error Codes

**HTTP Status Codes:**

- `200` - Success
- `201` - Created
- `400` - Bad request (validation error)
- `401` - Unauthorized (invalid/expired session)
- `403` - Forbidden (not allowed, e.g., not contacts)
- `404` - Not found
- `409` - Conflict (duplicate, already exists)
- `429` - Rate limited
- `500` - Server error

**Common Error Codes:**

- `MISSING_FIELDS` - Required fields missing
- `INVALID_CREDENTIALS` - Wrong username/password
- `USERNAME_EXISTS` - Username already taken
- `NO_CRYPTO_PROFILE` - No public key uploaded
- `INVALID_SIGNATURE` - Signature verification failed
- `INVALID_CHALLENGE` - Challenge expired/invalid
- `RECIPIENT_NOT_FOUND` - User doesn't exist
- `NOT_CONTACTS` - Users not in contact list
- `CANNOT_SEND_TO_SELF` - Attempting to message self
- `RATE_LIMIT_EXCEEDED` - Too many attempts

**Rate Limits:**

- Register: 3 attempts per hour per IP
- Login: 5 attempts per 15 minutes per IP
- Challenge: 10 attempts per 5 minutes per user

---

### Database Schema (Key Tables)

**accounts** - User accounts (username, password_hash, status)
**account_sessions** - 24-hour account sessions
**crypto_profiles** - Public keys and encrypted backups
**crypto_sessions** - 15-minute crypto sessions
**auth_challenges** - Challenge-response for crypto auth
**contacts** - Contact relationships (owner, contact, status)
**messages** - Encrypted messages (sender, recipient, payload)
**message_queue** - Offline message queue
**user_presence** - Online/offline status
**audit_events** - Security audit log

**SQL Helper Functions:**

- `are_contacts(id1, id2)` - Check if mutual contacts
- `get_contact_status(id1, id2)` - Get relationship status
- `get_pending_contact_requests(id)` - Get incoming requests
- `get_contacts_with_presence(id)` - Get contacts with online status
- `get_queued_messages(id)` - Get offline-queued messages

---

### Security Features

**Zero-Trust Architecture:**

- Server never sees plaintext messages (encrypted payloads only)
- Server never sees private keys (only public keys stored)
- Contact-based filtering prevents spam
- Separate crypto authentication layer

**Session Management:**

- Account sessions: 24 hours (username/password)
- Crypto sessions: 15 minutes (requires re-authentication)
- Automatic cleanup of expired sessions
- IP address and user agent logged

**Audit Logging:**
All security events logged with account ID, crypto profile ID, event type, IP, user agent, and metadata.

---

### Integration Notes

**Key Format:**

- Public keys: 64-character hex (Ed25519, 32 bytes)
- Private keys: 128-character hex (Ed25519, 64 bytes)
- Encrypted payloads: JSON with base64-encoded nonce and ciphertext

**Message Encryption:**

- Frontend encrypts with recipient's public key + sender's private key
- Uses NaCl box (Curve25519-XSalsa20-Poly1305)
- Ed25519 keys converted to Curve25519 for encryption
- Payload format: `{"nonce": "base64...", "encrypted": "base64..."}`

**Conversation History:**

- Backend returns `direction` field ("sent" or "received")
- Does NOT return `senderUsername` or `recipientUsername` in messages
- Frontend must infer sender/recipient from direction + conversation partner
- For decryption: use partner's public key + your private key

**Contact Public Keys:**

- Backend DOES return `publicKey` in `/api/contacts` response
- This is the Ed25519 public key needed for encryption
- Store it when loading contacts for message encryption

---

**Built with cryptographic paranoia** 🔐
