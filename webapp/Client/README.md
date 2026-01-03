# 🎨 VoidLink Frontend - Complete Architecture

## **Theme Concept: "The Void"**

- **Color Palette**: Deep blacks, dark purples, electric blues, subtle grays
- **Vibe**: Cyberpunk meets minimalism - secure, mysterious, professional
- **Typography**: Monospace for technical elements, clean sans-serif for UI
- **Animations**: Subtle, smooth, purposeful (no flashy distractions)

---

## **📄 Page Structure & Details**

### **1. Landing Page** (`/`)

**Purpose**: First impression, explain VoidLink's value proposition

**Sections:**

- **Hero Section**
  - Animated "void" background (particles/stars effect)
  - Tagline: "Zero-trust messaging where even we can't read your conversations"
  - CTA buttons: "Get Started" | "Learn More"
- **Features Grid** (3 columns)
  - 🔐 End-to-End Encryption
  - 🔑 No Password Hassles (Crypto auth)
  - 💾 Your Keys, Your Control
- **How It Works** (Visual flow)
  - Step 1: Generate Keys → Step 2: Add Contacts → Step 3: Send Messages
- **Security Guarantees**
  - "What we CAN'T do" section (read messages, access keys, decrypt data)
- **Footer**
  - Links: About, Docs, GitHub
  - "Built with cryptographic paranoia"

**Design Notes:**

- Dark theme with glowing accents
- Smooth scroll animations
- Responsive grid layout

---

### **2. Authentication Pages**

#### **2a. Register Page** (`/register`)

**Purpose**: Create account and generate crypto keys

**Layout:**

```
┌─────────────────────────────────────┐
│  VoidLink Logo                      │
│                                     │
│  Create Your Secure Account         │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Username                    │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Password                    │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Confirm Password            │   │
│  └─────────────────────────────┘   │
│                                     │
│  [✓] I understand my keys will be  │
│      generated locally              │
│                                     │
│  [ Create Account & Generate Keys ] │
│                                     │
│  Already have an account? Login     │
└─────────────────────────────────────┘
```

**Features:**

- Real-time password strength indicator
- Username availability check
- Clear security messaging
- Smooth transition to key generation

---

#### **2b. Key Generation Modal** (After registration)

**Purpose**: Generate Ed25519 keys and explain importance

**Layout:**

```
┌─────────────────────────────────────┐
│  🔑 Generating Your Encryption Keys │
│                                     │
│  [████████████░░░░░░░░] 75%        │
│                                     │
│  Creating your cryptographic        │
│  identity...                        │
│                                     │
│  ⚠️  IMPORTANT:                     │
│  • Keys are generated locally       │
│  • We never see your private key    │
│  • Backup your keys after setup     │
│                                     │
│  [ Continue to Backup ]             │
└─────────────────────────────────────┘
```

**Features:**

- Animated progress bar
- Educational tooltips
- Automatic transition to backup

---

#### **2c. Key Backup Page** (`/backup`)

**Purpose**: Download encrypted key backup

**Layout:**

```
┌─────────────────────────────────────┐
│  💾 Backup Your Keys                │
│                                     │
│  Your private key is encrypted and  │
│  ready to download.                 │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🔐 Encrypted Private Key    │   │
│  │                             │   │
│  │ Size: 2.4 KB                │   │
│  │ Format: Encrypted JSON      │   │
│  └─────────────────────────────┘   │
│                                     │
│  [ Download Backup ]                │
│  [ Skip for Now ]                   │
│                                     │
│  ⚠️  Without backup, losing your    │
│     device means losing access      │
└─────────────────────────────────────┘
```

**Features:**

- One-click download
- Clear warning about importance
- Option to skip (with confirmation)

---

#### **2d. Login Page** (`/login`)

**Purpose**: Two-layer authentication (account + crypto)

**Layout:**

```
┌─────────────────────────────────────┐
│  VoidLink Logo                      │
│                                     │
│  Welcome Back                       │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Username                    │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Password                    │   │
│  └─────────────────────────────┘   │
│                                     │
│  [ Login ]                          │
│                                     │
│  Don't have an account? Register    │
│                                     │
│  ─────────── OR ───────────         │
│                                     │
│  [ Import Keys from Backup ]        │
└─────────────────────────────────────┘
```

**Features:**

- After account login, automatic crypto challenge
- Loading state during challenge-response
- Error handling with clear messages

---

### **3. Main Application Pages**

#### **3a. Chat Dashboard** (`/chat`)

**Purpose**: Main messaging interface

**Layout:**

```
┌──────────┬─────────────────────────┬──────────┐
│          │                         │          │
│ Contacts │   Active Conversation   │  Profile │
│  List    │                         │   Info   │
│          │                         │          │
│ [Search] │  ┌──────────────────┐   │  Alice   │
│          │  │ Bob: Hey there!  │   │  ●Online │
│ ● Alice  │  │ 2:30 PM          │   │          │
│ ○ Bob    │  └──────────────────┘   │  🔑 Key  │
│ ● Charlie│                         │  Verified│
│          │  ┌──────────────────┐   │          │
│ [+ Add]  │  │ You: Hi Bob!     │   │  [Call]  │
│          │  │ 2:31 PM          │   │  [Video] │
│          │  └──────────────────┘   │  [Info]  │
│          │                         │          │
│          │  ┌──────────────────┐   │          │
│          │  │ Type message...  │   │          │
│          │  │ [Send] [📎]      │   │          │
│          │  └──────────────────┘   │          │
└──────────┴─────────────────────────┴──────────┘
```

**Features:**

- Three-column layout (responsive: collapses on mobile)
- Real-time message updates via WebSocket
- Online/offline status indicators
- Typing indicators
- Message encryption status (lock icon)
- Unread message badges

---

#### **3b. Contacts Page** (`/contacts`)

**Purpose**: Manage contacts and requests

**Layout:**

```
┌─────────────────────────────────────┐
│  👥 Contacts                        │
│                                     │
│  [Search contacts...]               │
│                                     │
│  ┌─ Pending Requests (2) ─────┐    │
│  │                             │    │
│  │  Alice wants to connect     │    │
│  │  [Accept] [Reject]          │    │
│  │                             │    │
│  │  Charlie wants to connect   │    │
│  │  [Accept] [Reject]          │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─ Your Contacts (5) ─────────┐   │
│  │                             │    │
│  │  ● Bob                      │    │
│  │  🔑 Verified | Online       │    │
│  │  [Message] [Remove]         │    │
│  │                             │    │
│  │  ○ Dave                     │    │
│  │  ⚠️  Not Verified | Offline │    │
│  │  [Verify] [Message]         │    │
│  └─────────────────────────────┘    │
│                                     │
│  [ + Add New Contact ]              │
└─────────────────────────────────────┘
```

**Features:**

- Pending requests section
- Contact verification status
- Online/offline indicators
- Quick actions (message, verify, remove)
- Search/filter contacts

---

#### **3c. Add Contact Modal**

**Purpose**: Send contact request

**Layout:**

```
┌─────────────────────────────────────┐
│  Add New Contact                    │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Search username...          │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  👤 bob_smith               │   │
│  │  🔑 Public Key: a3f2...     │   │
│  │  [ Send Request ]           │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Optional message:           │   │
│  │ ┌─────────────────────────┐ │   │
│  │ │ Hi! Let's connect...    │ │   │
│  │ └─────────────────────────┘ │   │
│  └─────────────────────────────┘   │
│                                     │
│  [ Send Request ] [ Cancel ]        │
└─────────────────────────────────────┘
```

**Features:**

- Real-time username search
- Display public key preview
- Optional message with request
- Validation feedback

---

#### **3d. Settings Page** (`/settings`)

**Purpose**: Account and security settings

**Layout:**

```
┌─────────────────────────────────────┐
│  ⚙️  Settings                       │
│                                     │
│  ┌─ Account ──────────────────┐    │
│  │ Username: alice             │    │
│  │ [ Change Password ]         │    │
│  │ [ Logout ]                  │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─ Security ─────────────────┐    │
│  │ 🔑 Crypto Keys              │    │
│  │ Public Key: a3f2e1...       │    │
│  │ [ View Full Key ]           │    │
│  │                             │    │
│  │ 💾 Key Backup               │    │
│  │ [✓] Cloud backup enabled    │    │
│  │ [ Download Backup ]         │    │
│  │ [ Update Backup ]           │    │
│  │                             │    │
│  │ 🔄 Key Rotation             │    │
│  │ Last rotated: Never         │    │
│  │ [ Rotate Keys ]             │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─ Sessions ─────────────────┐    │
│  │ Active Sessions (2)         │    │
│  │                             │    │
│  │ • Chrome (Current)          │    │
│  │ • Firefox - 2 hours ago     │    │
│  │   [ Revoke ]                │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─ Danger Zone ──────────────┐    │
│  │ [ Delete Account ]          │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

**Features:**

- Account management
- Key backup controls
- Session management
- Security audit log
- Account deletion

---

### **4. Utility Pages**

#### **4a. Profile Page** (`/profile/:username`)

**Purpose**: View user profile and verify keys

**Layout:**

```
┌─────────────────────────────────────┐
│  👤 Bob Smith                       │
│  ● Online                           │
│                                     │
│  ┌─ Public Key ───────────────┐    │
│  │ a3f2e1d4c5b6a7f8e9d0c1b2... │    │
│  │ [ Copy ] [ Verify ]         │    │
│  └─────────────────────────────┘    │
│                                     │
│  🔑 Verification Status             │
│  [✓] Key verified on 2026-01-01    │
│                                     │
│  [ Send Message ]                   │
│  [ Add to Contacts ]                │
│  [ Block User ]                     │
└─────────────────────────────────────┘
```

---

#### **4b. Key Verification Modal**

**Purpose**: Verify contact's public key

**Layout:**

```
┌─────────────────────────────────────┐
│  🔐 Verify Bob's Key                │
│                                     │
│  Compare this fingerprint with Bob  │
│  through a trusted channel:         │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  A3F2 E1D4 C5B6 A7F8        │   │
│  │  E9D0 C1B2 F3E4 D5C6        │   │
│  └─────────────────────────────┘   │
│                                     │
│  [ Copy Fingerprint ]               │
│                                     │
│  Does this match?                   │
│  [ Yes, Mark as Verified ]          │
│  [ No, Don't Trust ]                │
└─────────────────────────────────────┘
```

---

#### **4c. 404 Page** (`/404`)

**Purpose**: Handle unknown routes

**Layout:**

```
┌─────────────────────────────────────┐
│                                     │
│         Lost in the Void?           │
│                                     │
│  The page you're looking for        │
│  doesn't exist in this dimension.   │
│                                     │
│  [ Return Home ]                    │
│                                     │
└─────────────────────────────────────┘
```

---

## **🎨 Design System**

### **Colors**

```css
--void-black: #0a0a0f
--void-dark: #1a1a2e
--void-purple: #16213e
--void-blue: #0f3460
--void-accent: #00d4ff
--void-success: #00ff88
--void-warning: #ffaa00
--void-danger: #ff3366
--void-text: #e4e4e7
--void-text-dim: #a1a1aa
```

### **Typography**

```css
--font-main: 'Inter', sans-serif
--font-mono: 'JetBrains Mono', monospace
--font-display: 'Space Grotesk', sans-serif
```

### **Components**

- **Buttons**: Rounded, glowing hover effect
- **Inputs**: Dark with subtle border, focus glow
- **Cards**: Elevated with subtle shadow
- **Modals**: Backdrop blur, centered
- **Toasts**: Top-right, auto-dismiss

---

## **📱 Responsive Breakpoints**

- **Mobile**: < 768px (single column, bottom nav)
- **Tablet**: 768px - 1024px (two columns)
- **Desktop**: > 1024px (three columns)

---

## **🔧 Tech Stack**

- **Framework**: React 18 + TypeScript
- **Routing**: React Router v6
- **State**: Zustand (lightweight, simple)
- **Styling**: Tailwind CSS + custom theme
- **Crypto**: TweetNaCl.js (Ed25519 + NaCl box)
- **WebSocket**: Native WebSocket API
- **Forms**: React Hook Form + Zod validation
- **Animations**: Framer Motion
- **Icons**: Lucide React

---

## **📂 Project Structure**

```
Client/src/
├── components/
│   ├── auth/
│   │   ├── Register.tsx
│   │   ├── Login.tsx
│   │   ├── KeyGeneration.tsx
│   │   └── KeyBackup.tsx
│   ├── chat/
│   │   ├── ChatDashboard.tsx
│   │   ├── ContactList.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageInput.tsx
│   │   └── ProfileSidebar.tsx
│   ├── contacts/
│   │   ├── ContactsPage.tsx
│   │   ├── AddContactModal.tsx
│   │   └── ContactCard.tsx
│   ├── settings/
│   │   └── SettingsPage.tsx
│   ├── common/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   └── Loading.tsx
│   └── layout/
│       ├── Navbar.tsx
│       ├── Sidebar.tsx
│       └── Footer.tsx
├── crypto/
│   ├── keyManagement.ts
│   ├── encryption.ts
│   ├── signing.ts
│   └── storage.ts
├── services/
│   ├── api.ts
│   ├── websocket.ts
│   └── auth.ts
├── store/
│   ├── authStore.ts
│   ├── chatStore.ts
│   └── contactStore.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useWebSocket.ts
│   └── useCrypto.ts
├── utils/
│   ├── validation.ts
│   ├── formatting.ts
│   └── constants.ts
├── pages/
│   ├── Landing.tsx
│   ├── Register.tsx
│   ├── Login.tsx
│   ├── Chat.tsx
│   ├── Contacts.tsx
│   ├── Settings.tsx
│   └── NotFound.tsx
├── App.tsx
└── main.tsx
```

---

## **✅ Summary**

**Total Pages: 11**

1. Landing Page
2. Register Page
3. Login Page
4. Key Backup Page
5. Chat Dashboard
6. Contacts Page
7. Settings Page
8. Profile Page
9. 404 Page
10. Key Generation Modal (overlay)
11. Add Contact Modal (overlay)

**Key Features:**

- Dark "void" theme throughout
- Two-layer authentication flow
- Real-time messaging with WebSocket
- Contact management with verification
- Key backup and rotation
- Session management
- Responsive design (mobile-first)

---

## **🚀 Getting Started**

### **Development with Docker Compose**

The entire application runs with Docker Compose. No need to run `npm run dev` manually.

```bash
# Start all services (database, backend, frontend)
cd webapp
docker compose up --build

# Or use the rebuild script on Windows
.\scripts\docker-rebuild.bat
```

**Services:**

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Database: localhost:5432

**To view logs:**

```bash
docker compose logs -f frontend
docker compose logs -f backend
docker compose logs -f database
```

**To stop:**

```bash
docker compose down
```

### **Environment Variables**

The frontend uses these environment variables (already configured in `.env`):

```env
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000/ws
```

These are used by the browser to connect to the backend API and WebSocket server.

---

## **🎯 Implementation Status**

### **✅ Completed**

**Infrastructure:**

- ✅ Package.json with all dependencies
- ✅ Tailwind configuration with void theme
- ✅ PostCSS configuration
- ✅ Environment variables (.env and .env.example)
- ✅ Custom CSS with void theme and animations
- ✅ Constants file with API URLs and configuration

**Crypto Layer:**

- ✅ Key management (generation, backup, import, fingerprints)
- ✅ Signing utilities (Ed25519 signatures)
- ✅ Encryption utilities (NaCl box encryption)
- ✅ Secure storage (localStorage management)

**Services:**

- ✅ API service with all backend endpoints
- ✅ WebSocket service for real-time messaging
- ✅ Auth service for authentication flow

**State Management:**

- ✅ Auth store (Zustand)
- ✅ Chat store (Zustand)
- ✅ Contact store (Zustand)

**React Hooks:**

- ✅ useAuth hook
- ✅ useWebSocket hook
- ✅ useCrypto hook

**Common Components:**

- ✅ Button component
- ✅ Input component
- ✅ Modal component
- ✅ Toast component with useToast hook
- ✅ Loading component

**Pages:**

- ✅ Landing page
- ✅ Register page
- ✅ Login page
- ✅ Chat page (minimal)
- ✅ 404 page

**Routing:**

- ✅ React Router setup
- ✅ Protected routes
- ✅ App.tsx with route configuration
- ✅ main.tsx entry point

### **🚧 To Be Built**

**Full Chat Interface:**

- ⏳ Contact list component
- ⏳ Message list component
- ⏳ Message input component
- ⏳ Profile sidebar component

**Additional Pages:**

- ⏳ Contacts page
- ⏳ Settings page
- ⏳ Profile page
- ⏳ Key backup page

**Modals:**

- ⏳ Add contact modal
- ⏳ Key verification modal
- ⏳ Key generation modal

**Layout Components:**

- ⏳ Navbar component
- ⏳ Sidebar component
- ⏳ Footer component

---

**Status**: 🚀 Core Infrastructure Complete - Ready for Testing  
**Last Updated**: January 1, 2026  
**Backend Integration**: Ready (all APIs functional)  
**Next Step**: Test the application with `npm run dev`
