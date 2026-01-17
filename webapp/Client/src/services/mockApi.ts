import { SecureStorage } from "../crypto/storage";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Mock data
const mockUsers = [
  {
    username: "alice",
    publicKey: "mock_alice_public_key_64_chars_long_ed25519_format_example_123",
  },
  {
    username: "bob",
    publicKey: "mock_bob_public_key_64_chars_long_ed25519_format_example_456",
  },
  {
    username: "charlie",
    publicKey:
      "mock_charlie_public_key_64_chars_long_ed25519_format_example_789",
  },
  {
    username: "diana",
    publicKey: "mock_diana_public_key_64_chars_long_ed25519_format_example_012",
  },
];

const mockMessages = [
  {
    id: "msg1",
    senderUsername: "alice",
    recipientUsername: "demo",
    encryptedPayload: JSON.stringify({
      nonce: "mock_nonce_24_bytes_base64",
      encryptedData: "mock_encrypted_hello_message",
    }),
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    delivered: true,
  },
  {
    id: "msg2",
    senderUsername: "demo",
    recipientUsername: "alice",
    encryptedPayload: JSON.stringify({
      nonce: "mock_nonce_24_bytes_base64_2",
      encryptedData: "mock_encrypted_reply_message",
    }),
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    delivered: true,
  },
  {
    id: "msg3",
    senderUsername: "bob",
    recipientUsername: "demo",
    encryptedPayload: JSON.stringify({
      nonce: "mock_nonce_24_bytes_base64_3",
      encryptedData: "mock_encrypted_welcome_message",
    }),
    timestamp: new Date(Date.now() - 900000).toISOString(),
    delivered: true,
  },
];

let mockContacts = [
  {
    username: "alice",
    publicKey: "mock_alice_public_key_64_chars_long_ed25519_format_example_123",
    status: "accepted",
    isOnline: true,
  },
  {
    username: "bob",
    publicKey: "mock_bob_public_key_64_chars_long_ed25519_format_example_456",
    status: "accepted",
    isOnline: false,
  },
];

let mockPendingRequests = [
  {
    id: "req1",
    fromUsername: "charlie",
    message: "Hi! I'd like to connect with you.",
    timestamp: new Date().toISOString(),
  },
];

class MockApiService {
  private delay(ms: number = 300) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Auth endpoints
  async register(username: string, password: string) {
    await this.delay();
    if (username === "demo") {
      return {
        success: true,
        message: "Account created successfully",
        accountId: "demo_account_id",
        username: "demo",
      };
    }
    throw new ApiError("Username already exists", 400);
  }

  async login(username: string, password: string) {
    await this.delay();
    if (username === "demo" && password === "demo123") {
      const token = "mock_account_token_" + Date.now();
      SecureStorage.setAccountToken(token);
      return {
        success: true,
        message: "Login successful",
        accountId: "demo_account_id",
        username: "demo",
        token,
      };
    }
    throw new ApiError("Invalid credentials", 401);
  }

  async logout() {
    await this.delay();
    SecureStorage.clearAccountToken();
    SecureStorage.clearCryptoToken();
    return { success: true, message: "Logged out successfully" };
  }

  async validateSession() {
    await this.delay();
    const token = SecureStorage.getAccountToken();
    if (token) {
      return { valid: true, username: "demo", accountId: "demo_account_id" };
    }
    throw new ApiError("Invalid session", 401);
  }

  // Crypto endpoints
  async uploadPublicKey(publicKey: string) {
    await this.delay();
    return {
      success: true,
      message: "Public key uploaded successfully",
      profileId: "demo_crypto_profile_id",
    };
  }

  async getChallenge() {
    await this.delay();
    const challenge =
      "mock_challenge_" + Math.random().toString(36).substring(2, 15);
    return {
      challenge,
      expiresAt: new Date(Date.now() + 300000).toISOString(),
    };
  }

  async verifyChallenge(challenge: string, signature: string) {
    await this.delay();
    const cryptoToken = "mock_crypto_token_" + Date.now();
    SecureStorage.setCryptoToken(cryptoToken);
    return {
      success: true,
      message: "Challenge verified successfully",
      cryptoToken,
    };
  }

  async enableBackup(encryptedPrivateKey: string) {
    await this.delay();
    return { success: true, message: "Backup enabled successfully" };
  }

  async fetchBackup() {
    await this.delay();
    return {
      encryptedPrivateKey: "mock_encrypted_private_key_backup",
      createdAt: new Date().toISOString(),
    };
  }

  // User endpoints
  async searchUsers(query: string) {
    await this.delay();
    const results = mockUsers.filter((user) =>
      user.username.toLowerCase().includes(query.toLowerCase()),
    );
    return { users: results };
  }

  async getUserByUsername(username: string) {
    await this.delay();
    const user = mockUsers.find((u) => u.username === username);
    if (!user) {
      throw new ApiError("User not found", 404);
    }
    return { data: user };
  }

  // Contact endpoints
  async sendContactRequest(targetUsername: string, message?: string) {
    await this.delay();
    return {
      success: true,
      message: "Contact request sent successfully",
      requestId: "req_" + Date.now(),
    };
  }

  async getPendingRequests() {
    await this.delay();
    return {
      data: {
        pendingRequests: mockPendingRequests.map((req) => ({
          requestId: req.id,
          requesterUsername: req.fromUsername,
          requesterPublicKey: "mock_" + req.fromUsername + "_public_key",
          message: req.message,
          receivedAt: req.timestamp,
        })),
      },
    };
  }

  async acceptContactRequest(requestId: string) {
    await this.delay();
    const request = mockPendingRequests.find((r) => r.id === requestId);
    if (request) {
      mockContacts.push({
        username: request.fromUsername,
        publicKey: "mock_" + request.fromUsername + "_public_key",
        status: "accepted",
        isOnline: Math.random() > 0.5,
      });
      mockPendingRequests = mockPendingRequests.filter(
        (r) => r.id !== requestId,
      );
    }
    return { success: true, message: "Contact request accepted" };
  }

  async rejectContactRequest(requestId: string) {
    await this.delay();
    mockPendingRequests = mockPendingRequests.filter((r) => r.id !== requestId);
    return { success: true, message: "Contact request rejected" };
  }

  async getContacts() {
    await this.delay();
    return {
      data: {
        contacts: mockContacts.map((contact) => ({
          username: contact.username,
          publicKey: contact.publicKey,
          contactCryptoId: "mock_" + contact.username + "_crypto_id",
          status: contact.status,
          isOnline: contact.isOnline,
          addedAt: new Date().toISOString(),
          acceptedAt: new Date().toISOString(),
        })),
      },
    };
  }

  async getContactStatus(username: string) {
    await this.delay();
    const contact = mockContacts.find((c) => c.username === username);
    return {
      status: contact?.status || "none",
      isOnline: contact?.isOnline || false,
    };
  }

  // Message endpoints
  async sendMessage(recipientUsername: string, encryptedPayload: string) {
    await this.delay();
    const newMessage = {
      id: "msg_" + Date.now(),
      senderUsername: "demo",
      recipientUsername,
      encryptedPayload,
      timestamp: new Date().toISOString(),
      delivered: true,
    };
    mockMessages.push(newMessage);
    return {
      success: true,
      message: "Message sent successfully",
      messageId: newMessage.id,
    };
  }

  async getConversation(
    username: string,
    since?: string,
    before?: string,
    limit = 50,
  ) {
    await this.delay();
    let messages = mockMessages.filter(
      (m) =>
        (m.senderUsername === username && m.recipientUsername === "demo") ||
        (m.senderUsername === "demo" && m.recipientUsername === username),
    );

    // Sort by timestamp (newest first for backend compatibility)
    messages.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return {
      data: {
        conversation: messages.slice(0, limit).map((msg) => ({
          messageId: msg.id,
          direction: msg.senderUsername === "demo" ? "sent" : "received",
          encryptedPayload: msg.encryptedPayload,
          messageType: "message",
          delivered: msg.delivered,
          read: false,
          createdAt: msg.timestamp,
        })),
      },
    };
  }

  async getInbox(limit = 50, offset = 0, undeliveredOnly = false) {
    await this.delay();
    let messages = mockMessages.filter((m) => m.recipientUsername === "demo");
    if (undeliveredOnly) {
      messages = messages.filter((m) => !m.delivered);
    }
    return {
      data: {
        messages: messages.slice(offset, offset + limit).map((msg) => ({
          messageId: msg.id,
          senderUsername: msg.senderUsername,
          encryptedPayload: msg.encryptedPayload,
          messageType: "message",
          delivered: msg.delivered,
          createdAt: msg.timestamp,
        })),
      },
    };
  }

  async markMessageDelivered(messageId: string) {
    await this.delay();
    const message = mockMessages.find((m) => m.id === messageId);
    if (message) {
      message.delivered = true;
    }
    return { success: true };
  }

  // Health check
  async healthCheck() {
    await this.delay();
    return {
      status: "healthy",
      message: "Mock API is running",
      timestamp: new Date().toISOString(),
    };
  }
}

export const api = new MockApiService();
