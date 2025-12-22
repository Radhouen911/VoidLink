# 🔐 Zero-Trust Secure Messenger

> _A privacy-first messaging app where even we can't read your messages_

## What's This All About?

Imagine a messaging app where the company running it literally **cannot** spy on your conversations - even if they wanted to. That's what we've built here.

**The Big Idea:** Your messages are locked up tight before they ever leave your device. The server? It's just shuffling around encrypted gibberish. No backdoors, no "trust us" promises - just math keeping your secrets safe.

This started as a university project, but we think it shows how messaging _should_ work in a world where privacy actually matters.

## Why We Built This

**🎯 Our Mission**

- Create a messenger that's actually secure _and_ easy to use
- Prove that zero-trust isn't just a buzzword - it's a better way to build things
- Show that you don't need to choose between privacy and convenience

**🚫 What Our Server CAN'T Do**

- Read your messages (they're encrypted before we see them)
- Pretend to be you (no access to your private keys)
- Decrypt your stuff even if hackers break in

**📋 What We Actually Accomplished**

- Built a working prototype that puts security first
- Created detailed system diagrams that show exactly how everything works
- Demonstrated that privacy-by-design isn't just theoretical

## How It Actually Works

### 🤝 The Trust Model

**Your Device = Trusted Friend**  
Your browser does all the crypto magic. Keys are generated here, messages encrypted here.

**Our Server = Helpful Stranger**  
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

## ✨ What You Can Actually Do

- **🔐 Generate Your Own Keys**: No registration forms, just click and you're secure
- **💬 Send Encrypted Messages**: One-on-one conversations that stay private
- **🔄 Automatic Key Rotation**: Your security gets stronger over time
- **💾 Encrypted Backups**: Download your keys, keep them safe
- **✅ Verify Contacts**: Know you're really talking to who you think you are
- **📱 Works Offline**: Queue messages when you're disconnected
- **🛡️ XSS Protection**: Built-in defenses against common web attacks

## 🚧 What We Deliberately Left Out

We kept this focused instead of trying to build everything:

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
☁️ Our Server (The Untrusted Zone)
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

These aren't just pretty pictures - they show the trust boundaries, error handling, and protocol choices that make this system work.

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

## 🧪 Project Status

This is a **design-focused prototype** that demonstrates:

- How to think about system architecture
- Real-world security vs usability tradeoffs
- Clear technical communication
- Defensible security decisions

The goal isn't to build the biggest system, but to build a _well-designed_ one.

## 👥 The Team Behind This

**Mohamed Radhouen Boufateh** - Lead Developer  
**Abdelkader Ben Nejma** - Security Architecture  
**Basma K'hil** - University Instructor & Advisor

## 🎓 Why This Matters

In a world where "privacy policy" usually means "we're going to sell your data," we wanted to show there's a better way.

This project proves you can build systems where privacy isn't a promise you have to trust - it's a mathematical guarantee you can verify.

---

_Built with ❤️ and a healthy dose of cryptographic paranoia_
