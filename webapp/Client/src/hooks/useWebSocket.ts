import { useCallback, useEffect, useState } from "react";
import { SecureStorage } from "../crypto/storage";
import { websocket } from "../services/websocket";
import { useChatStore } from "../store/chatStore";
import { useContactStore } from "../store/contactStore";

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const addMessage = useChatStore((state) => state.addMessage);
  const updateMessageStatus = useChatStore(
    (state) => state.updateMessageStatus
  );
  const setUserOnline = useChatStore((state) => state.setUserOnline);
  const setUserTyping = useChatStore((state) => state.setUserTyping);
  const updateContactStatus = useContactStore(
    (state) => state.updateContactStatus
  );

  useEffect(() => {
    // Connect to WebSocket
    websocket
      .connect()
      .then(() => setIsConnected(true))
      .catch((error) => {
        console.error("Failed to connect to WebSocket:", error);
        setIsConnected(false);
      });

    // Handle incoming messages
    const handleNewMessage = async (data: any) => {
      // Backend sends: { type: "message_received", messageId, senderUsername, senderCryptoProfileId, encryptedPayload, messageType, sentAt, fromQueue, priority }
      console.log("WebSocket message received:", data);

      const senderUsername = data.senderUsername;
      const senderPublicKey = data.senderCryptoProfileId;

      // We need to get the sender's public key from contacts
      const { contacts } = useContactStore.getState();
      const senderContact = contacts.find((c) => c.username === senderUsername);

      if (!senderContact) {
        console.error("Sender not in contacts:", senderUsername);
        return;
      }

      const myPublicKey = SecureStorage.getPublicKey();
      const myUsername = SecureStorage.getUsername();

      if (myPublicKey && myUsername) {
        try {
          addMessage(senderUsername, {
            id: data.messageId,
            senderId: senderContact.publicKey,
            senderUsername: senderUsername,
            recipientId: myPublicKey,
            recipientUsername: myUsername,
            encryptedPayload: data.encryptedPayload,
            decryptedContent: "[Encrypted]", // Will decrypt when viewing
            messageType: data.messageType || "message",
            delivered: false,
            createdAt: data.sentAt || new Date().toISOString(),
          });
          console.log("Message added to store from:", senderUsername);
        } catch (error) {
          console.error("Failed to handle message:", error);
        }
      }
    };

    // Handle message delivery confirmations
    const handleMessageDelivered = (data: any) => {
      const { messageId } = data;
      updateMessageStatus(messageId, true);
    };

    // Handle presence updates
    const handlePresenceUpdate = (data: any) => {
      const { username, status } = data;
      const isOnline = status === "online";
      setUserOnline(username, isOnline);
      updateContactStatus(username, isOnline);
    };

    // Handle typing indicators
    const handleTypingIndicator = (data: any) => {
      const { username, isTyping } = data;
      setUserTyping(username, isTyping);
    };

    // Register handlers
    websocket.on("message_received", handleNewMessage);
    websocket.on("new_message", handleNewMessage); // Support both event names
    websocket.on("message_delivered", handleMessageDelivered);
    websocket.on("presence_update", handlePresenceUpdate);
    websocket.on("typing_indicator", handleTypingIndicator);

    // Cleanup on unmount
    return () => {
      websocket.off("message_received", handleNewMessage);
      websocket.off("new_message", handleNewMessage);
      websocket.off("message_delivered", handleMessageDelivered);
      websocket.off("presence_update", handlePresenceUpdate);
      websocket.off("typing_indicator", handleTypingIndicator);
      websocket.disconnect();
      setIsConnected(false);
    };
  }, [
    addMessage,
    updateMessageStatus,
    setUserOnline,
    setUserTyping,
    updateContactStatus,
  ]);

  const sendMessage = useCallback(
    (recipientUsername: string, content: string) => {
      websocket.send("send_message", {
        recipientUsername,
        content,
      });
    },
    []
  );

  const sendTypingIndicator = useCallback(
    (recipientUsername: string, isTyping: boolean) => {
      websocket.send("typing_indicator", {
        recipientUsername,
        isTyping,
      });
    },
    []
  );

  return {
    sendMessage,
    sendTypingIndicator,
    isConnected,
  };
};
