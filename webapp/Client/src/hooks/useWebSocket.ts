import { useCallback, useEffect } from "react";
import { decryptMessage } from "../crypto/encryption";
import { SecureStorage } from "../crypto/storage";
import { websocket } from "../services/websocket";
import { useChatStore } from "../store/chatStore";
import { useContactStore } from "../store/contactStore";

export const useWebSocket = () => {
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
    websocket.connect().catch((error) => {
      console.error("Failed to connect to WebSocket:", error);
    });

    // Handle incoming messages
    const handleNewMessage = async (data: any) => {
      const { message } = data;
      const privateKey = SecureStorage.getPrivateKey();

      if (privateKey) {
        try {
          const decryptedContent = decryptMessage(
            message.encryptedPayload,
            message.senderPublicKey,
            privateKey
          );

          addMessage(message.senderUsername, {
            ...message,
            decryptedContent,
          });
        } catch (error) {
          console.error("Failed to decrypt message:", error);
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
    websocket.on("new_message", handleNewMessage);
    websocket.on("message_delivered", handleMessageDelivered);
    websocket.on("presence_update", handlePresenceUpdate);
    websocket.on("typing_indicator", handleTypingIndicator);

    // Cleanup on unmount
    return () => {
      websocket.off("new_message", handleNewMessage);
      websocket.off("message_delivered", handleMessageDelivered);
      websocket.off("presence_update", handlePresenceUpdate);
      websocket.off("typing_indicator", handleTypingIndicator);
      websocket.disconnect();
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
    isConnected: websocket.isConnected(),
  };
};
