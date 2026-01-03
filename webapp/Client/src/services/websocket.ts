import { SecureStorage } from "../crypto/storage";
import { WS_URL } from "../utils/constants";

type MessageHandler = (data: any) => void;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private isConnecting = false;

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error("Connection already in progress"));
        return;
      }

      this.isConnecting = true;

      const accountToken = SecureStorage.getAccountToken();
      const cryptoToken = SecureStorage.getCryptoToken();

      if (!accountToken || !cryptoToken) {
        this.isConnecting = false;
        reject(new Error("Missing authentication tokens"));
        return;
      }

      const wsUrl = `${WS_URL}?account_token=${accountToken}&crypto_token=${cryptoToken}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("WebSocket connected");
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.isConnecting = false;
        reject(error);
      };

      this.ws.onclose = () => {
        console.log("WebSocket disconnected");
        this.isConnecting = false;
        this.attemptReconnect();
      };
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`
    );

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error("Reconnection failed:", error);
      });
    }, delay);
  }

  private handleMessage(data: any) {
    const { type } = data;
    const handlers = this.messageHandlers.get(type) || [];
    handlers.forEach((handler) => handler(data));
  }

  on(type: string, handler: MessageHandler) {
    const handlers = this.messageHandlers.get(type) || [];
    handlers.push(handler);
    this.messageHandlers.set(type, handlers);
  }

  off(type: string, handler: MessageHandler) {
    const handlers = this.messageHandlers.get(type) || [];
    const filtered = handlers.filter((h) => h !== handler);
    this.messageHandlers.set(type, filtered);
  }

  send(type: string, payload: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...payload }));
    } else {
      console.error("WebSocket not connected");
      throw new Error("WebSocket not connected");
    }
  }

  /**
   * Send a message via WebSocket
   * Returns a promise that resolves when the server confirms receipt
   */
  sendMessage(
    recipientUsername: string,
    recipientCryptoProfileId: string,
    encryptedPayload: string,
    messageType: string = "message"
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error("WebSocket not connected"));
        return;
      }

      // Set up one-time listeners for response
      const successHandler = (data: any) => {
        if (data.action === "message_sent") {
          this.off("success", successHandler);
          this.off("error", errorHandler);
          resolve(data.data);
        }
      };

      const errorHandler = (data: any) => {
        this.off("success", successHandler);
        this.off("error", errorHandler);
        reject(new Error(data.message || "Failed to send message"));
      };

      this.on("success", successHandler);
      this.on("error", errorHandler);

      // Send the message
      this.send("message_send", {
        recipientUsername,
        recipientCryptoProfileId,
        encryptedPayload,
        messageType,
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        this.off("success", successHandler);
        this.off("error", errorHandler);
        reject(new Error("Message send timeout"));
      }, 10000);
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageHandlers.clear();
    this.reconnectAttempts = 0;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const websocket = new WebSocketService();
