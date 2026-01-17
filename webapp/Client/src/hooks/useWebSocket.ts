import { useCallback, useEffect, useState } from "react";
import { SecureStorage } from "../crypto/storage";
import { api, webSocketService } from "../services/index";
import { useChatStore } from "../store/chatStore";
import { useContactStore } from "../store/contactStore";

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const addMessage = useChatStore((state) => state.addMessage);
  const updateMessageStatus = useChatStore(
    (state) => state.updateMessageStatus,
  );
  const updateMessageRead = useChatStore((state) => state.updateMessageRead);
  const setUserOnline = useChatStore((state) => state.setUserOnline);
  const setUserTyping = useChatStore((state) => state.setUserTyping);
  const updateContactStatus = useContactStore(
    (state) => state.updateContactStatus,
  );

  // Track typing timeouts to prevent race conditions
  const typingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

  useEffect(() => {
    // Connect to WebSocket
    webSocketService
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
      let senderContact = contacts.find((c) => c.username === senderUsername);

      if (!senderContact) {
        console.warn(
          "Sender not in contacts:",
          senderUsername,
          "- attempting to fetch info",
        );

        try {
          // Fetch user info to get public key
          const response: any = await api.getUserByUsername(senderUsername);
          const userData = response.data;

          if (userData && userData.publicKey) {
            senderContact = {
              username: senderUsername,
              publicKey: userData.publicKey,
              cryptoProfileId: senderPublicKey, // ID from message
              contactStatus: "unknown", // not in contacts yet
              isOnline: false,
              addedAt: new Date().toISOString(),
            };
          } else {
            console.error(
              `Could not fetch public key for ${senderUsername}. Dropping message.`,
            );
            return;
          }
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
                privateKey,
              );
              if (decrypted) {
                decryptedContent = decrypted;
              } else {
                console.warn(
                  "Decryption returned null for message:",
                  data.messageId,
                );
              }
            } else {
              console.warn("No private key available for decryption");
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

          // ALWAYS send delivery confirmation
          webSocketService.send("message_delivered", {
            messageId: data.messageId,
          });

          // IF this is the active conversation, send READ confirmation immediately
          const { activeConversation } = useChatStore.getState();
          if (activeConversation === senderUsername) {
            webSocketService.send("message_read", {
              messageId: data.messageId,
            });
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
    const handleContactRequestReceived = async (data: any) => {
      console.log("Contact request received:", data);

      try {
        // Reload pending requests from backend
        const response: any = await api.getPendingRequests();
        const requests = response.data?.pendingRequests || [];

        // Map backend format to frontend format
        const mappedRequests = requests.map((req: any) => ({
          id: req.requestId,
          requesterUsername: req.requesterUsername,
          requesterPublicKey: req.requesterPublicKey || "",
          message: req.message,
          createdAt: req.receivedAt,
        }));

        // Update store
        useContactStore.getState().setPendingRequests(mappedRequests);

        console.log(
          `Loaded ${mappedRequests.length} pending requests via WebSocket`,
        );
      } catch (error) {
        console.error("Failed to reload pending requests:", error);
      }
    };

    // Handle contact accepted
    const handleContactAccepted = async (data: any) => {
      console.log("Contact accepted:", data);
      const { username } = data; // Backend sends username of new contact

      try {
        // Reload contacts list from backend
        const response: any = await api.getContacts();
        const contactsData = response.data?.contacts || [];

        // Map backend format to frontend format
        const mappedContacts = contactsData.map((contact: any) => ({
          username: contact.username,
          publicKey: contact.publicKey || contact.public_key || "",
          cryptoProfileId:
            contact.contactCryptoId || contact.contact_crypto_id || "",
          contactStatus:
            contact.status ||
            contact.contactStatus ||
            contact.contact_status ||
            "accepted",
          isOnline:
            contact.presence?.isOnline ||
            contact.isOnline ||
            contact.is_online ||
            false,
          addedAt: contact.addedAt || contact.added_at,
          acceptedAt: contact.acceptedAt || contact.accepted_at,
        }));

        // Update store
        useContactStore.getState().setContacts(mappedContacts);

        console.log(`Loaded ${mappedContacts.length} contacts via WebSocket`);

        // If we have a username, auto-open chat with new contact
        if (username) {
          const { setActiveConversation } = useChatStore.getState();
          setActiveConversation(username);
          console.log(`Auto-opened chat with new contact: ${username}`);
        }
      } catch (error) {
        console.error("Failed to reload contacts:", error);
      }
    };

    // Handle presence updates
    const handlePresenceUpdate = (data: any) => {
      // Backend sends: { type: "presence_update", cryptoProfileId, status, timestamp }
      const { cryptoProfileId, status } = data;
      const isOnline = status === "online";

      // Find contact by cryptoProfileId
      const { contacts } = useContactStore.getState();
      const contact = contacts.find(
        (c) => c.cryptoProfileId === cryptoProfileId,
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
      setUserTyping(senderUsername, true);

      // Clear existing timeout for this user to prevent race conditions
      const existingTimeout = typingTimeouts.get(senderUsername);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // SAFETY TIMEOUT: Auto-clear typing status after 5 seconds to prevent "ghost typing"
      const timeout = setTimeout(() => {
        setUserTyping(senderUsername, false);
        typingTimeouts.delete(senderUsername);
      }, 5000);

      typingTimeouts.set(senderUsername, timeout);
    };

    const handleTypingStop = (data: any) => {
      // Backend sends: { type: "typing_stop", senderUsername, senderCryptoProfileId, timestamp }
      const { senderUsername } = data;
      console.log(`${senderUsername} stopped typing`);
      setUserTyping(senderUsername, false);

      // Clear any pending timeout for this user
      const existingTimeout = typingTimeouts.get(senderUsername);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        typingTimeouts.delete(senderUsername);
      }
    };

    // Register handlers
    webSocketService.on("message_received", handleNewMessage);
    // webSocketService.on("new_message", handleNewMessage); // Removed legacy event listener
    webSocketService.on("message_delivered", handleMessageDelivered);
    webSocketService.on("message_delivery_confirmed", handleDeliveryConfirmed);
    webSocketService.on("message_read_confirmed", handleReadConfirmed);
    webSocketService.on("presence_update", handlePresenceUpdate);
    webSocketService.on("typing_start", handleTypingStart);
    webSocketService.on("typing_stop", handleTypingStop);
    webSocketService.on(
      "contact_request_received",
      handleContactRequestReceived,
    );
    webSocketService.on("contact_accepted", handleContactAccepted);

    // Set up ping/pong keep-alive (every 30 seconds)
    const pingInterval = setInterval(() => {
      if (webSocketService.isConnected()) {
        webSocketService.send("ping", {});
      }
    }, 30000);

    // Cleanup on unmount
    return () => {
      clearInterval(pingInterval);

      // Clear all typing timeouts
      typingTimeouts.forEach((timeout) => clearTimeout(timeout));
      typingTimeouts.clear();

      webSocketService.off("message_received", handleNewMessage);
      // webSocketService.off("new_message", handleNewMessage);
      webSocketService.off("message_delivered", handleMessageDelivered);
      webSocketService.off(
        "message_delivery_confirmed",
        handleDeliveryConfirmed,
      );
      webSocketService.off("message_read_confirmed", handleReadConfirmed);
      webSocketService.off("presence_update", handlePresenceUpdate);
      webSocketService.off("typing_start", handleTypingStart);
      webSocketService.off("typing_stop", handleTypingStop);
      webSocketService.off(
        "contact_request_received",
        handleContactRequestReceived,
      );
      webSocketService.off("contact_accepted", handleContactAccepted);
      webSocketService.disconnect();
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
      webSocketService.send("send_message", {
        recipientUsername,
        content,
      });
    },
    [],
  );

  const sendTypingIndicator = useCallback(
    (recipientUsername: string, isTyping: boolean) => {
      webSocketService.send("typing_indicator", {
        recipientUsername,
        isTyping,
      });
    },
    [],
  );

  return {
    sendMessage,
    sendTypingIndicator,
    isConnected,
  };
};
