import { SecureStorage } from "../crypto/storage";
import { API_URL } from "../utils/constants";

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add custom headers from options
    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    // Add account token if available
    const accountToken = SecureStorage.getAccountToken();
    if (accountToken) {
      headers["Authorization"] = `Bearer ${accountToken}`;
    }

    // Add crypto token if available
    const cryptoToken = SecureStorage.getCryptoToken();
    if (cryptoToken) {
      headers["X-Crypto-Session"] = cryptoToken;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new ApiError(
          data.message || "Request failed",
          response.status,
          data.error
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError("Network error", 0);
    }
  }

  // Auth endpoints
  async register(username: string, password: string) {
    return this.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  }

  async login(username: string, password: string) {
    return this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  }

  async logout() {
    return this.request("/api/auth/logout", {
      method: "POST",
    });
  }

  async validateSession() {
    return this.request("/api/auth/session", {
      method: "GET",
    });
  }

  // Crypto endpoints
  async uploadPublicKey(publicKey: string) {
    return this.request("/api/auth/crypto/upload-key", {
      method: "POST",
      body: JSON.stringify({ publicKey }),
    });
  }

  async getChallenge() {
    return this.request("/api/auth/crypto/challenge", {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  async verifyChallenge(challenge: string, signature: string) {
    return this.request("/api/auth/crypto/verify", {
      method: "POST",
      body: JSON.stringify({ challenge, signature }),
    });
  }

  async enableBackup(encryptedPrivateKey: string) {
    return this.request("/api/auth/crypto/enable-backup", {
      method: "POST",
      body: JSON.stringify({ encryptedPrivateKey }),
    });
  }

  async fetchBackup() {
    return this.request("/api/auth/crypto/fetch-backup", {
      method: "GET",
    });
  }

  // User endpoints
  async searchUsers(query: string) {
    return this.request(`/api/users?q=${encodeURIComponent(query)}`, {
      method: "GET",
    });
  }

  async getUserByUsername(username: string) {
    return this.request(`/api/users/${username}`, {
      method: "GET",
    });
  }

  // Contact endpoints
  async sendContactRequest(targetUsername: string, message?: string) {
    return this.request("/api/contacts/request", {
      method: "POST",
      body: JSON.stringify({ username: targetUsername, message }),
    });
  }

  async getPendingRequests() {
    return this.request("/api/contacts/requests/pending", {
      method: "GET",
    });
  }

  async acceptContactRequest(requestId: string) {
    return this.request(`/api/contacts/${requestId}/accept`, {
      method: "POST",
    });
  }

  async rejectContactRequest(requestId: string) {
    return this.request(`/api/contacts/${requestId}/reject`, {
      method: "POST",
    });
  }

  async getContacts() {
    return this.request("/api/contacts", {
      method: "GET",
    });
  }

  async getContactStatus(username: string) {
    return this.request(`/api/contacts/status/${username}`, {
      method: "GET",
    });
  }

  // Message endpoints
  async sendMessage(recipientUsername: string, encryptedPayload: string) {
    return this.request("/api/messages/send", {
      method: "POST",
      body: JSON.stringify({
        recipientUsername,
        encryptedPayload,
        messageType: "message",
      }),
    });
  }

  async getConversation(username: string, since?: string, limit = 50) {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (since) params.append("since", since);

    return this.request(`/api/messages/conversation/${username}?${params}`, {
      method: "GET",
    });
  }

  async getInbox(limit = 50, offset = 0, undeliveredOnly = false) {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      undelivered_only: undeliveredOnly.toString(),
    });

    return this.request(`/api/messages/inbox?${params}`, {
      method: "GET",
    });
  }

  async markMessageDelivered(messageId: string) {
    return this.request(`/api/messages/${messageId}/delivered`, {
      method: "PATCH",
    });
  }

  // Health check
  async healthCheck() {
    return this.request("/api/health", {
      method: "GET",
    });
  }
}

export const api = new ApiService();
