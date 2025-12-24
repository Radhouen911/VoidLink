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

## Database Schema

### Users Table

- `id` - Primary key
- `username` - Unique username
- `public_key` - User's public key (for encryption)
- `encrypted_private_key` - Optional encrypted private key backup
- `created_at`, `last_seen` - Timestamps

### Messages Table

- `id` - Primary key
- `sender_id`, `recipient_id` - User references
- `encrypted_content` - Encrypted message content
- `encrypted_session_key` - Session key encrypted with recipient's public key
- `message_type` - Type of message (message, rekey, etc.)
- `delivered` - Delivery status
- `created_at` - Timestamp

### Contacts Table

- User relationship management
- Contact verification status

### Sessions Table

- Active session tracking
- Session token management

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/challenge` - Get authentication challenge
- `POST /api/auth/verify` - Verify challenge response

### Users

- `GET /api/users/:username` - Get user's public key
- `GET /api/users?q=search` - Search users

### Messages

- `POST /api/messages/send` - Send encrypted message
- `GET /api/messages/inbox/:userId` - Get user's messages
- `PATCH /api/messages/:id/delivered` - Mark message as delivered

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
