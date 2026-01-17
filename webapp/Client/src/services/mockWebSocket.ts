// Mock WebSocket service for GitHub Pages demo
export class MockWebSocketService {
  private listeners: { [key: string]: Function[] } = {};
  private connected = false;
  private reconnectTimer?: NodeJS.Timeout;

  connect() {
    console.log("🔗 Mock WebSocket: Connecting...");

    // Simulate connection delay
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        this.connected = true;
        console.log("✅ Mock WebSocket: Connected");
        this.emit("connect");
        resolve();

        // Simulate some demo activity
        this.simulateDemoActivity();
      }, 1000);
    });
  }

  disconnect() {
    console.log("🔌 Mock WebSocket: Disconnecting...");
    this.connected = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.emit("disconnect");
  }

  send(type: string, data: any) {
    if (!this.connected) {
      console.warn("⚠️ Mock WebSocket: Not connected, cannot send:", {
        type,
        data,
      });
      return;
    }

    console.log("📤 Mock WebSocket: Sending:", { type, data });

    // Simulate message delivery confirmation
    if (type === "message_send") {
      setTimeout(() => {
        this.emit("message_delivered", {
          messageId: data.messageId,
          timestamp: new Date().toISOString(),
        });
      }, 500);
    }
  }

  async sendMessage(
    recipientUsername: string,
    recipientCryptoId: string,
    encryptedPayload: string,
    messageType: string,
  ) {
    if (!this.connected) {
      throw new Error("WebSocket not connected");
    }

    const messageId = "mock_msg_" + Date.now();
    console.log("📤 Mock WebSocket: Sending message:", {
      recipientUsername,
      messageId,
    });

    // Simulate successful send
    setTimeout(() => {
      this.emit("message_delivered", { messageId });
    }, 300);

    return {
      messageId,
      deliveredRealtime: true,
    };
  }

  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: Function) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(
        (cb) => cb !== callback,
      );
    }
  }

  isConnected() {
    return this.connected;
  }

  private emit(event: string, data?: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(data));
    }
  }

  private simulateDemoActivity() {
    // Simulate typing indicators
    setTimeout(() => {
      this.emit("typing_start", { senderUsername: "alice" });
    }, 3000);

    setTimeout(() => {
      this.emit("typing_stop", { senderUsername: "alice" });
    }, 5000);

    // Simulate incoming message
    setTimeout(() => {
      this.emit("message_received", {
        messageId: "demo_msg_" + Date.now(),
        senderUsername: "alice",
        senderCryptoProfileId: "mock_alice_crypto_id",
        encryptedPayload: JSON.stringify({
          nonce: "demo_nonce_" + Math.random().toString(36),
          encryptedData: "demo_encrypted_message_" + Math.random().toString(36),
        }),
        sentAt: new Date().toISOString(),
        messageType: "message",
      });
    }, 8000);

    // Simulate presence updates
    setTimeout(() => {
      this.emit("presence_update", {
        cryptoProfileId: "mock_charlie_crypto_id",
        status: "online",
      });
    }, 10000);

    setTimeout(() => {
      this.emit("presence_update", {
        cryptoProfileId: "mock_bob_crypto_id",
        status: "offline",
      });
    }, 15000);
  }
}

export const mockWebSocketService = new MockWebSocketService();
