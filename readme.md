# 🔐 VoidLink

> _Zero-trust secure messaging system where privacy is mathematically guaranteed, not policy-dependent_

## 🌐 **Live Demo**

**Try VoidLink now:** [https://radhouen911.github.io/VoidLink/](https://radhouen911.github.io/VoidLink/)  
_Click "Decrypt & Login" to explore the interface with mock data - no setup required!_

[![Academic Project](https://img.shields.io/badge/Type-Academic%20Project-blue.svg)](https://github.com/radhouen911/voidlink)
[![Zero Trust](https://img.shields.io/badge/Security-Zero%20Trust-green.svg)](https://github.com/radhouen911/voidlink)
[![End-to-End Encryption](https://img.shields.io/badge/Encryption-E2EE-red.svg)](https://github.com/radhouen911/voidlink)

## 🎯 What's VoidLink All About?

VoidLink is a **proof-of-concept secure messaging system** that demonstrates how to build privacy-preserving communication where the server literally **cannot** access your messages - even if compromised.

**The Core Innovation:** All cryptographic operations happen client-side. The server only routes encrypted data blobs, creating mathematical privacy guarantees instead of relying on policy promises.

**Academic Context:** Developed as a university project to explore zero-trust architecture principles in real-world messaging systems, complete with comprehensive technical documentation and system analysis.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Modern web browser with JavaScript enabled

### Running VoidLink

1. **Clone the repository**

   ```bash
   git clone https://github.com/radhouen911/voidlink.git
   cd voidlink
   ```

2. **Start with Docker Compose**

   ```bash
   cd webapp
   docker-compose up -d
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

4. **Create your first account**
   - Register with username and password
   - System automatically generates your Ed25519 key pair
   - Start messaging with end-to-end encryption!

### Manual Setup (Development)

```bash
# Backend
cd webapp/Server
npm install
npm run dev

# Frontend (new terminal)
cd webapp/Client
npm install
npm run dev
```

## 📁 Project Structure

```
voidlink/
├── 📄 report/                 # Academic report and documentation
│   ├── main.tex              # LaTeX source
│   ├── main.pdf              # Compiled report
│   └── diagram/               # System architecture diagrams
├── 🌐 webapp/                 # Main application
│   ├── Client/                # React frontend
│   ├── Server/                # Node.js backend
│   └── docker-compose.yml    # Container orchestration
└── 📊 diagram/                # Additional UML diagrams
```

**🎯 Our Mission**

- Create a messenger that's actually secure _and_ easy to use
- Prove that zero-trust isn't just a buzzword - it's a better way to build things
- Show that you don't need to choose between privacy and convenience

**🚫 What VoidLink's Server CAN'T Do**

- Read your messages (they're encrypted before we see them)
- Pretend to be you (no access to your private keys)
- Decrypt your stuff even if hackers break in

**📋 What We Actually Accomplished**

- Built VoidLink as a working prototype that puts security first
- Created detailed system diagrams that show exactly how everything works
- Demonstrated that privacy-by-design isn't just theoretical

## How VoidLink Actually Works

### 🤝 The Trust Model

**Your Device = Trusted Friend**  
Your browser does all the crypto magic. Keys are generated here, messages encrypted here.

**VoidLink's Server = Helpful Stranger**  
It routes messages and stores encrypted blobs, but it's designed assuming it might be compromised tomorrow.

### 🔒 The Crypto Stuff (Simplified)

- **End-to-End Encryption**: Messages are locked before they leave your browser
- **No Password Hassles**: We use cryptographic challenges instead of passwords you'll forget
- **Forward Secrecy**: Even if someone steals your keys today, yesterday's messages stay safe
- **Local Storage**: Your private keys never leave your device (except in encrypted backups you control)

### 🎨 Keeping It Human

Security shouldn't feel like rocket science. We've focused on making strong crypto feel natural:

- Clear visual indicators when you're talking to the right person
- Automatic key backups (because losing keys = losing messages)
- Offline message queuing (send now, deliver when they're online)

## ✨ What You Can Do With VoidLink

- **🔐 Generate Your Own Keys**: No registration forms, just click and you're secure
- **💬 Send Encrypted Messages**: One-on-one conversations that stay private
- **🔄 Automatic Key Rotation**: Your security gets stronger over time
- **💾 Encrypted Backups**: Download your keys, keep them safe
- **✅ Verify Contacts**: Know you're really talking to who you think you are
- **📱 Works Offline**: Queue messages when you're disconnected
- **🛡️ XSS Protection**: Built-in defenses against common web attacks

## 🚧 What We Deliberately Left Out

We kept VoidLink focused instead of trying to build everything:

**❌ No Group Chats** - One-on-one is complex enough to get right  
**❌ No Social Feed** - This is about private messaging, not broadcasting  
**❌ No Multi-Device Sync** - Keeps the crypto simpler and more secure  
**❌ No Ads or Tracking** - Because that would defeat the whole point

_These aren't missing features - they're intentional design choices._

## 🏗️ Under the Hood

Here's how the pieces fit together:

```
🖥️ Your Browser (The Trusted Zone)
├── 🎨 User Interface
├── 🔐 Crypto Engine
└── 💾 Encrypted Storage
    │
    │ (Only encrypted data crosses this line)
    ▼
☁️ VoidLink Server (The Untrusted Zone)
├── 🔑 Authentication Service
├── 📡 Message Router
└── 🗄️ Database (encrypted blobs only)
```

**The Golden Rule:** All encryption happens in your browser, before anything touches the network.

## 📊 The Diagrams That Tell the Story

We've created detailed UML diagrams that show exactly how everything works:

- **🏗️ Component Diagram** - The big picture architecture
- **👤 Account Creation Flow** - How you get started securely
- **🔐 Login & Authentication** - Passwordless login that actually works
- **💬 Message Exchange** - How your secrets stay secret
- **🔄 Key Rotation** - Keeping you secure over time
- **🎯 User Experience Flow** - The human side of crypto

These aren't just pretty pictures - they show the trust boundaries, error handling, and protocol choices that make VoidLink work.

## 🛡️ What We're Protecting Against

**✅ Threats We Handle:**

- Curious or malicious server operators
- Network eavesdroppers and attackers
- Database breaches and data leaks
- Basic cross-site scripting attacks

**⚠️ What's Outside Our Scope:**

- Compromised user devices or malware
- Physical access to your computer
- Someone forcing you to decrypt messages

We're honest about what we can and can't protect against.

## 👥 The Team Behind VoidLink

**Mohamed Radhouen Boufateh** - Lead Developer & System Architect  
**Abdelkader Ben Nejma** - Co-Developer & Security Researcher  
**Basma K'hil** - University Instructor & Project Advisor

## 📚 Academic Documentation

This project includes comprehensive academic documentation:

- **📄 Complete Technical Report** (`report/main.pdf`) - 40+ page analysis covering:
  - System architecture and design decisions
  - Cryptographic implementation details
  - Security analysis and threat modeling
  - Performance evaluation and testing results
- **📊 UML Diagrams** - Visual system documentation including:
  - Component and deployment diagrams
  - Sequence diagrams for key operations
  - User flow and interaction diagrams

## 🤝 Contributing

While this is primarily an academic project, we welcome:

- 🐛 Bug reports and security findings
- 💡 Suggestions for improvements
- 📖 Documentation enhancements
- 🔍 Code reviews and feedback

Please open an issue or submit a pull request!

## 📄 License

This project is released under the MIT License. See `LICENSE` file for details.

## ⚠️ Important Disclaimer

**VoidLink is a proof-of-concept academic project.** While it demonstrates secure messaging principles, it has not undergone comprehensive security auditing and should not be used for production or sensitive communications without further security review.

## 🎓 Why This Matters

In a world where "privacy policy" usually means "we're going to sell your data," VoidLink shows there's a better way.

VoidLink proves you can build systems where privacy isn't a promise you have to trust - it's a mathematical guarantee you can verify.

## 🙏 Acknowledgments

Special thanks to:

- Our university for supporting this research project
- The open-source cryptography community
- All contributors and reviewers who helped improve this work

---

_Built with ❤️ and a healthy dose of cryptographic paranoia_
