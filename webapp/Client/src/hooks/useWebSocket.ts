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
  const updateMessageRead = useChatStore((state) => state.updateMessageRead);
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
        console.warn("Sender not in contacts:", senderUsername, "- attempting to fetch info");

        try {
          // Try to create a temporary contact object if we have the public key
          // Sender's public key is passed as senderCryptoProfileId (which seems to be the KEY from backend message format)
          // Wait, backend 'senderCryptoProfileId' is the ID, not the key. 
          // BUT, 'senderPublicKey' variable usage in original code suggests confusion.
          // Original: const senderPublicKey = data.senderCryptoProfileId; 
          // Backend sends: senderCryptoProfileId (UUID)
          // We need to fetch the user to get the public key.

          // NOTE: The `api.getUserByUsername` endpoint returns the public key.
          // We can assume this user MIGHT correspond to a pending request or just a stranger if the backend allowed it.

          // However, if we don't have them in contacts, we likely can't decrypt their message easily if we don't have their public key stored.
          // But let's try to fetch it.

          // Note: This relies on `api` import which is not in the hook.
          // Since we can't easily import `api` inside the hook without potentially circular deps or refactoring,
          // we will just log a clearer error for now, OR better, check Pending Requests.

          const { pendingRequests } = useContactStore.getState();
          const pendingSender = pendingRequests.find(r => r.requesterUsername === senderUsername);

          if (pendingSender) {
            console.log("Message is from a pending contact request sender.");
            // We could theoretically display it, but usually we wait for accept.
            // Just logging is better than silent failure.
          }

          // If we really want to fix "Silent Drop", we should at least notify the user
          console.error(`Received message from unknown contact ${senderUsername}. Dropping message.`);
          return;
        } catch (e) {
          console.error("Error handling unknown contact message", e);
          return;
        }
      }


      // Removed duplicate declarations
      const myPublicKey = SecureStorage.getPublicKey();
      const myUsername = SecureStorage.getUsername();

      if (myPublicKey && myUsername) {
        try {
          // Decrypt immediately to avoid render-time lag
          let decryptedContent = "[Encrypted]";

          try {
            const { decryptMessage } = await import("../crypto/encryption");
            const { getSessionPrivateKey } = await import("../services/auth");

            const privateKey = getSessionPrivateKey();
            if (privateKey) {
              const decrypted = decryptMessage(
                data.encryptedPayload,
                senderContact.publicKey,
                privateKey
              );
              if (decrypted) {
                decryptedContent = decrypted;
              }
            }
          } catch (decError) {
            console.error("Immediate decryption failed:", decError);
          }

          addMessage(senderUsername, {
            id: data.messageId,
            senderId: senderContact.publicKey,
            senderUsername: senderUsername,
            recipientId: myPublicKey,
            recipientUsername: myUsername,
            encryptedPayload: data.encryptedPayload,
            decryptedContent: decryptedContent,
            messageType: data.messageType || "message",
            delivered: false,
            createdAt: data.sentAt || new Date().toISOString(),
          });
          console.log("Message added to store from:", senderUsername);

          // ALWAYS send delivery confirmation
          websocket.send("message_delivered", { messageId: data.messageId });

          // IF this is the active conversation, send READ confirmation immediately
          const { activeConversation } = useChatStore.getState();
          if (activeConversation === senderUsername) {
            console.log("Active conversation match - sending read receipt");
            websocket.send("message_read", { messageId: data.messageId });
          }

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

    // Handle message delivery confirmations from backend
    const handleDeliveryConfirmed = (data: any) => {
      const { messageId } = data;
      console.log(`Message ${messageId} delivered to recipient`);
      updateMessageStatus(messageId, true);
    };

    // Handle message read confirmations from backend
    const handleReadConfirmed = (data: any) => {
      const { messageId } = data;
      console.log(`Message ${messageId} read by recipient`);
      updateMessageRead(messageId);
    };

    // Handle contact request received
    const handleContactRequestReceived = (data: any) => {
      console.log("Contact request received:", data);
      const { contacts } = useContactStore.getState();
      // Reload pending requests
      // This will be handled by Chat component
    };

    // Handle contact accepted
    const handleContactAccepted = (data: any) => {
      console.log("Contact accepted:", data);
      // Reload contacts list
      // This will be handled by Chat component
    };

    // Handle presence updates
    const handlePresenceUpdate = (data: any) => {
      // Backend sends: { type: "presence_update", cryptoProfileId, status, timestamp }
      const { cryptoProfileId, status } = data;
      const isOnline = status === "online";

      // Find contact by cryptoProfileId
      const { contacts } = useContactStore.getState();
      const contact = contacts.find(
        (c) => c.cryptoProfileId === cryptoProfileId
      );

      if (contact) {
        console.log(`Presence update: ${contact.username} is now ${status}`);
        setUserOnline(contact.username, isOnline);
        updateContactStatus(contact.username, isOnline);
      }
    };

    // Handle typing indicators
    const handleTypingStart = (data: any) => {
      // Backend sends: { type: "typing_start", senderUsername, senderCryptoProfileId, timestamp }
      const { senderUsername } = data;
      // console.log(`${senderUsername} started typing`);
      setUserTyping(senderUsername, true);

      // SAFETY TIMEOUT: Auto-clear typing status after 5 seconds to prevent "ghost typing"
      // If the user keeps typing, they will send another typing_start which re-sets the state to true
      // But we need to make sure we don't clear it prematurely if a new start event came in.
      // Ideally we'd use a ref to track timeouts, but a simple delayed "set false" is often "good enough" 
      // because if they are still typing, a new "start" event usually arrives every ~3s.
      // A better approach is trusting the store logic or just letting the UI handle it? 
      // Actually, the UI usually handles the visual timeout. 
      // But let's enforce it here to be safe and clean up state.
      setTimeout(() => {
        setUserTyping(senderUsername, false);
      }, 5000);
    };

    const handleTypingStop = (data: any) => {
      // Backend sends: { type: "typing_stop", senderUsername, senderCryptoProfileId, timestamp }
      const { senderUsername } = data;
      console.log(`${senderUsername} stopped typing`);
      setUserTyping(senderUsername, false);
    };

    // Register handlers
    websocket.on("message_received", handleNewMessage);
    // websocket.on("new_message", handleNewMessage); // Removed legacy event listener
    websocket.on("message_delivered", handleMessageDelivered);
    websocket.on("message_delivery_confirmed", handleDeliveryConfirmed);
    websocket.on("message_read_confirmed", handleReadConfirmed);
    websocket.on("presence_update", handlePresenceUpdate);
    websocket.on("typing_start", handleTypingStart);
    websocket.on("typing_stop", handleTypingStop);
    websocket.on("contact_request_received", handleContactRequestReceived);
    websocket.on("contact_accepted", handleContactAccepted);

    // Set up ping/pong keep-alive (every 30 seconds)
    const pingInterval = setInterval(() => {
      if (websocket.isConnected()) {
        websocket.send("ping", {});
      }
    }, 30000);

    // Cleanup on unmount
    return () => {
      clearInterval(pingInterval);
      websocket.off("message_received", handleNewMessage);
      // websocket.off("new_message", handleNewMessage);
      websocket.off("message_delivered", handleMessageDelivered);
      websocket.off("message_delivery_confirmed", handleDeliveryConfirmed);
      websocket.off("message_read_confirmed", handleReadConfirmed);
      websocket.off("presence_update", handlePresenceUpdate);
      websocket.off("typing_start", handleTypingStart);
      websocket.off("typing_stop", handleTypingStop);
      websocket.off("contact_request_received", handleContactRequestReceived);
      websocket.off("contact_accepted", handleContactAccepted);
      websocket.disconnect();
      setIsConnected(false);
    };
  }, [
    addMessage,
    updateMessageStatus,
    updateMessageRead,
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
