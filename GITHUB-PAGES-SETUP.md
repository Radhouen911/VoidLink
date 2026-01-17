# VoidLink GitHub Pages Demo Setup

This guide explains how to set up the VoidLink demo on GitHub Pages.

## What's Included

The `gh-pages` branch contains:

- **Frontend demo** with mock data and services
- **No backend required** - everything runs in the browser
- **Demo credentials**: username `demo`, password `demo123`
- **Mock contacts**: alice, bob, charlie with simulated conversations
- **Simulated features**: typing indicators, presence updates, message delivery

## Files Added for Demo

### Configuration

- `.env.demo` - Demo environment variables
- `vite.config.gh-pages.ts` - GitHub Pages build configuration
- `build-demo.bat` - Build script for demo

### Mock Services

- `src/services/index.ts` - Service factory (switches between real/mock)
- `src/services/mockApi.ts` - Mock API with demo data
- `src/services/mockWebSocket.ts` - Mock WebSocket with simulated activity
- `src/utils/constants.ts` - Updated to detect demo mode

### Updated Files

- `src/pages/Chat.tsx` - Updated to use service factory
- `src/hooks/useWebSocket.ts` - Updated to use service factory
- `src/services/auth.ts` - Updated to use service factory

## GitHub Pages Setup Instructions

1. **Go to your repository settings**
   - Navigate to `https://github.com/YOUR_USERNAME/VoidLink/settings`

2. **Enable GitHub Pages**
   - Scroll down to "Pages" section
   - Under "Source", select "Deploy from a branch"
   - Choose branch: `gh-pages`
   - Choose folder: `/ (root)`
   - Click "Save"

3. **Access your demo**
   - Your demo will be available at: `https://YOUR_USERNAME.github.io/VoidLink/`
   - It may take a few minutes to deploy

## Demo Features

### Login

- Use credentials: `demo` / `demo123`
- Mock authentication with simulated tokens

### Contacts

- Pre-loaded contacts: alice, bob
- Pending request from: charlie
- Simulated online/offline status

### Messaging

- Mock conversation history
- Simulated typing indicators
- Mock message delivery confirmations
- Encrypted payload simulation (not real encryption in demo)

### Real-time Simulation

- Alice will start "typing" after 3 seconds
- Incoming message from Alice after 8 seconds
- Presence updates for contacts

## Building Demo Locally

To build the demo version locally:

```bash
cd webapp/Client
./build-demo.bat
```

This will:

1. Copy demo environment settings
2. Build with GitHub Pages configuration
3. Output files to `../../gh-pages-dist/`

## Technical Details

### Demo Mode Detection

The app detects demo mode via environment variable:

```javascript
export const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";
```

### Service Factory Pattern

Services are switched based on demo mode:

```javascript
export const api = IS_DEMO_MODE ? mockApi : realApi;
export const webSocketService = IS_DEMO_MODE
  ? mockWebSocketService
  : realWebSocketService;
```

### Mock Data Structure

- **Users**: alice, bob, charlie, diana with mock public keys
- **Messages**: Pre-defined conversation history
- **Contacts**: Simulated contact relationships
- **Requests**: Mock pending contact requests

## Limitations

This is a **demo only** - it does not provide real security:

- No actual encryption (mock payloads)
- No real authentication
- No persistent data storage
- Simulated network activity

For the full secure messaging experience, use the complete application with the backend server.
