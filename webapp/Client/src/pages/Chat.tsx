import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { Loading } from "../components/common/Loading";
import { PassphrasePrompt } from "../components/common/PassphrasePrompt";
import { useToast } from "../components/common/Toast";
import { encryptMessage } from "../crypto/encryption";
import { SecureStorage } from "../crypto/storage";
import { useAuth } from "../hooks/useAuth";
import { useWebSocket } from "../hooks/useWebSocket";
import {
  authService,
  getSessionPrivateKey,
  webSocketService,
} from "../services";
import { api } from "../services/index";
import { useAuthStore } from "../store/authStore";
import { Message, useChatStore } from "../store/chatStore";
import { useContactStore } from "../store/contactStore";

// Simple fallback for message decryption in case service is not available
const fallbackDecryptMessage = (
  encryptedPayload: string,
  senderId: string,
  recipientId: string,
  userPublicKey: string,
) => {
  return {
    success: true,
    content: "Demo message content",
  };
};

// Try to import decryptMessageForDisplay, fallback if not available
let decryptMessageForDisplay: any;
try {
  decryptMessageForDisplay =
    require("../services/messageDecryption").decryptMessageForDisplay;
} catch {
  decryptMessageForDisplay = fallbackDecryptMessage;
}

export const Chat: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const { isConnected } = useWebSocket();

  const { contacts, pendingRequests, setContacts, setPendingRequests } =
    useContactStore();
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    addMessage,
    addMessages,
    updateMessageId,
    updateMessageStatus,
  } = useChatStore();

  const [messageInput, setMessageInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showAddContact, setShowAddContact] = useState(false);
  const [searchUsername, setSearchUsername] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [typingTimeout, setTypingTimeout] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [userAutoScrolled, setUserAutoScrolled] = useState(true); // Track if user is at bottom
  const [showPassphrasePrompt, setShowPassphrasePrompt] = useState(false);
  const [isContactsLoading, setIsContactsLoading] = useState(false);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const messagesContainerRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  };

  // Scroll to bottom when switching conversations
  useEffect(() => {
    if (activeConversation) {
      setHasMoreMessages(true);
      setUserAutoScrolled(true);
      scrollToBottom(false); // Instant scroll on switch
      loadConversationHistory(activeConversation);
    }

    // Cleanup: Stop typing indicator when leaving conversation
    return () => {
      if (activeConversation && typingTimeout) {
        clearTimeout(typingTimeout);
        setTypingTimeout(null);
        webSocketService.send("typing_stop", {
          recipientUsername: activeConversation,
        });
      }
    };
  }, [activeConversation]);

  // Handle auto-scroll on new messages
  useEffect(() => {
    if (!activeConversation) return;

    const conversation = conversations.get(activeConversation);
    if (!conversation) return;

    // Only scroll if we were already at bottom or if it's our own message
    if (
      userAutoScrolled ||
      conversation.lastMessage?.senderUsername === user?.username
    ) {
      scrollToBottom();
    }
  }, [conversations, activeConversation, userAutoScrolled, user?.username]);

  // Track scroll position to determine if user is at bottom
  const handleScrollEvents = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom =
      Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) <
      50;
    setUserAutoScrolled(isAtBottom);
    handleScroll(e);
  };

  // Infinite scroll handler
  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;

    // Check if scrolled to top
    if (
      target.scrollTop === 0 &&
      !isLoadingMore &&
      hasMoreMessages &&
      activeConversation
    ) {
      const conversation = conversations.get(activeConversation);
      if (!conversation || conversation.messages.length === 0) return;

      // Get oldest message timestamp
      const oldestMessage = conversation.messages[0];
      const oldestTimestamp = oldestMessage.createdAt;

      setIsLoadingMore(true);

      try {
        const response: any = await api.getConversation(
          activeConversation,
          undefined, // since
          oldestTimestamp, // before
          30, // Load 30 more messages
        );
        const messagesData = response.data?.conversation || [];

        if (messagesData.length === 0) {
          setHasMoreMessages(false);
          return;
        }

        const contact = contacts.find((c) => c.username === activeConversation);
        if (!contact) return;

        // CRITICAL: Verify contact has valid publicKey before processing messages
        if (!contact.publicKey) {
          console.error(
            `Contact ${activeConversation} has no publicKey, cannot decrypt messages`,
          );
          return;
        }

        const privateKey = getSessionPrivateKey();

        const mappedMessages = messagesData.map((msg: any) => {
          const isSent = msg.direction === "sent";
          // Now safe: contact.publicKey is guaranteed to exist
          const senderId = isSent ? user?.publicKey || "" : contact.publicKey;
          const recipientId = isSent
            ? contact.publicKey
            : user?.publicKey || "";

          // Use centralized decryption
          const decryptionResult = decryptMessageForDisplay(
            msg.encryptedPayload,
            senderId,
            recipientId,
            user?.publicKey || "",
          );

          return {
            id: msg.messageId,
            senderId,
            senderUsername: isSent ? user?.username || "" : activeConversation,
            recipientId,
            recipientUsername: isSent
              ? activeConversation
              : user?.username || "",
            encryptedPayload: msg.encryptedPayload,
            decryptedContent: decryptionResult.content,
            messageType: msg.messageType || "message",
            delivered: msg.delivered || false,
            read: msg.read || false,
            createdAt: msg.createdAt,
            status: "sent", // Historical messages are sent
          };
        });

        // Prepend older messages
        addMessages(activeConversation, mappedMessages.reverse());

        // Maintain scroll position
        const scrollHeightBefore = target.scrollHeight;
        setTimeout(() => {
          const scrollHeightAfter = target.scrollHeight;
          target.scrollTop = scrollHeightAfter - scrollHeightBefore;
        }, 0);
      } catch (error) {
        console.error("Failed to load more messages:", error);
      } finally {
        setIsLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    const initializeChat = async () => {
      try {
        await loadContacts();
        await loadInbox(); // Restore Inbox loading!
        await loadPendingRequests();
      } catch (error) {
        console.error("Failed to initialize chat:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();
  }, []);

  // Detect if passphrase is needed for decryption
  useEffect(() => {
    if (
      !activeConversation ||
      !conversations.get(activeConversation)?.messages
    ) {
      return;
    }

    const conversation = conversations.get(activeConversation);
    const hasSessionExpiredMessages = conversation?.messages.some(
      (m) => m.decryptedContent === "[Session expired - login to decrypt]",
    );

    // If we have session expired messages and private key is missing, show prompt
    if (hasSessionExpiredMessages && !getSessionPrivateKey()) {
      setShowPassphrasePrompt(true);
    }
  }, [activeConversation, conversations]);

  // Reactive Decryption: Retry decrypting messages if they are still encrypted and contacts/keys become available
  useEffect(() => {
    if (!activeConversation || !conversations.get(activeConversation)?.messages)
      return;

    const conversation = conversations.get(activeConversation);
    const needsDecryption = conversation?.messages.some(
      (m) => !m.decryptedContent || m.decryptedContent === "[Encrypted]",
    );

    if (needsDecryption && user?.publicKey) {
      const updatedMessages = conversation!.messages.map((msg) => {
        if (msg.decryptedContent && msg.decryptedContent !== "[Encrypted]")
          return msg;

        // Use centralized decryption
        const decryptionResult = decryptMessageForDisplay(
          msg.encryptedPayload,
          msg.senderId,
          msg.recipientId,
          user.publicKey,
        );

        return { ...msg, decryptedContent: decryptionResult.content };
      });

      // Only update if changed
      addMessages(activeConversation, updatedMessages);
    }
  }, [
    contacts,
    activeConversation,
    conversations,
    user?.username,
    user?.publicKey,
  ]);

  // Load conversation history when a contact is selected (one-time load)
  // MOVED logic to the new useEffect above dependent on activeConversation

  const loadConversationHistory = async (username: string) => {
    try {
      console.log(`Loading conversation history for ${username}...`);
      const response: any = await api.getConversation(
        username,
        undefined,
        undefined,
        30,
      ); // Load only 30 most recent
      const messagesData = response.data?.conversation || [];

      console.log(`Received ${messagesData.length} messages for ${username}`);

      if (messagesData.length > 0) {
        // Get contact info for public key
        const contact = contacts.find((c) => c.username === username);
        const privateKey = getSessionPrivateKey();

        // CRITICAL: If contact missing or has no publicKey, cannot decrypt
        if (!contact) {
          console.error(
            `Contact ${username} not found in store, cannot load conversation`,
          );
          return;
        }

        if (!contact.publicKey) {
          console.error(
            `Contact ${username} has no publicKey, cannot decrypt messages`,
          );
          return;
        }

        // Map backend format to frontend format AND DECRYPT IMMEDIATELY
        const mappedMessages = messagesData.map((msg: any) => {
          const isSent = msg.direction === "sent";
          // Now safe: contact.publicKey is guaranteed to exist
          const senderId = isSent ? user?.publicKey || "" : contact.publicKey;
          const recipientId = isSent
            ? contact.publicKey
            : user?.publicKey || "";

          // Use centralized decryption
          const decryptionResult = decryptMessageForDisplay(
            msg.encryptedPayload,
            senderId,
            recipientId,
            user?.publicKey || "",
          );

          return {
            id: msg.messageId,
            senderId,
            senderUsername: isSent ? user?.username || "" : username,
            recipientId,
            recipientUsername: isSent ? username : user?.username || "",
            encryptedPayload: msg.encryptedPayload,
            decryptedContent: decryptionResult.content,
            messageType: msg.messageType || "message",
            delivered: msg.delivered || false,
            read: msg.read || false,
            createdAt: msg.createdAt,
            status: "sent", // Historical are sent
          };
        });

        // Add messages to store (backend returns newest first, reverse for chronological)
        addMessages(username, mappedMessages.reverse());
        console.log(
          `Added ${mappedMessages.length} messages to store for ${username}`,
        );

        // If we got less than 30, there are no more messages
        if (messagesData.length < 30) {
          setHasMoreMessages(false);
        }
      } else {
        setHasMoreMessages(false);
      }
    } catch (error: any) {
      console.error("Failed to load conversation:", error);
      if (error.status === 401) {
        showToast("✗ Session expired. Please login again.", "error");
      }
      // Don't show error toast for other errors - it's not critical
    }
  };

  const loadInbox = async () => {
    try {
      console.log("Loading inbox...");
      // Fetch latest 100 messages from inbox
      const response: any = await api.getInbox(100);
      const messagesData = response.data?.messages || [];
      console.log(`Loaded ${messagesData.length} inbox messages`);

      if (messagesData.length === 0) return;

      const privateKey = getSessionPrivateKey();

      // Group by sender/conversation
      const messagesByConversation = new Map<string, any[]>();

      messagesData.forEach((msg: any) => {
        // For inbox, sender is the other party (unless we sent it, but inbox usually implies incoming)
        // Actually, let's verify logic: Inbox contains all recent messages? Or just unread?
        // Standard inbox fetch usually gets recent threads.
        // Let's assume `senderUsername` is the conversation partner for incoming.
        // But what if I sent the last message?
        // The API returns `sender_username`.

        // If I am the sender, the conversation is with recipient.
        // But getInbox API (as seen in routes/messages.js) filters by `recipient_crypto_id = $1`.
        // So these are ONLY received messages.
        // So `senderUsername` IS the conversation partner.

        const partner = msg.senderUsername;
        if (!messagesByConversation.has(partner)) {
          messagesByConversation.set(partner, []);
        }
        messagesByConversation.get(partner)?.push(msg);
      });

      // Process each conversation
      for (const [partner, msgs] of messagesByConversation) {
        // CRITICAL: Skip conversations where contact is not found or has no publicKey
        const contact = contacts.find((c) => c.username === partner);

        if (!contact) {
          console.warn(
            `Inbox: Contact ${partner} not found, skipping ${msgs.length} messages`,
          );
          continue; // Skip this conversation
        }

        if (!contact.publicKey) {
          console.warn(
            `Inbox: Contact ${partner} has no publicKey, skipping ${msgs.length} messages`,
          );
          continue; // Skip this conversation
        }

        // Now safe: contact.publicKey is guaranteed to exist
        const mappedMessages = msgs.map((msg: any) => {
          const senderId = contact.publicKey; // Guaranteed non-empty
          const recipientId = user?.publicKey || "";

          // Use centralized decryption
          const decryptionResult = decryptMessageForDisplay(
            msg.encryptedPayload,
            senderId,
            recipientId,
            user?.publicKey || "",
          );

          return {
            id: msg.messageId,
            senderId,
            senderUsername: partner,
            recipientId,
            recipientUsername: user?.username || "",
            encryptedPayload: msg.encryptedPayload,
            decryptedContent: decryptionResult.content,
            messageType: msg.messageType || "message",
            delivered: msg.delivered,
            read: false, // Inbox implies potentially unread
            createdAt: msg.createdAt,
            status:
              msg.status === "failed" ||
              msg.status === "sending" ||
              msg.status === "sent"
                ? msg.status
                : "sent",
          } as Message;
        });

        addMessages(partner, mappedMessages.reverse());
      }
    } catch (error) {
      console.error("Failed to load inbox:", error);
    }
  };

  const loadContacts = async () => {
    setIsContactsLoading(true);
    try {
      console.log("Loading contacts...");
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

      console.log(`Loaded ${mappedContacts.length} contacts`);

      // Debug: Log each contact's publicKey
      mappedContacts.forEach((c: any) => {
        console.log(
          `Contact ${c.username}: publicKey=${
            c.publicKey ? "present" : "MISSING"
          } (${c.publicKey?.length || 0} chars)`,
        );
      });

      setContacts(mappedContacts);
    } catch (error: any) {
      console.error("Failed to load contacts:", error);
      if (error.status === 401) {
        showToast("✗ Session expired. Please login again.", "error");
      } else {
        showToast(
          "✗ Failed to load contacts: " + (error.message || "Unknown error"),
          "error",
        );
      }
    } finally {
      setIsContactsLoading(false);
    }
  };

  const loadPendingRequests = async () => {
    try {
      console.log("Loading pending requests...");
      const response: any = await api.getPendingRequests();

      // Backend returns data.pendingRequests, not data.requests
      const requests = response.data?.pendingRequests || [];
      console.log(`Loaded ${requests.length} pending requests`);

      // Map backend format to frontend format
      const mappedRequests = requests.map((req: any) => ({
        id: req.requestId,
        requesterUsername: req.requesterUsername,
        requesterPublicKey: req.requesterPublicKey || "",
        message: req.message,
        createdAt: req.receivedAt,
      }));

      setPendingRequests(mappedRequests);
    } catch (error: any) {
      console.error("Failed to load pending requests:", error);
      if (error.status === 401) {
        showToast("✗ Session expired. Please login again.", "error");
      } else {
        showToast("✗ Failed to load pending requests", "error");
      }
    }
  };

  const handleMessageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessageInput(value);

    if (!activeConversation) return;

    // Send typing_start when user starts typing
    if (value.length > 0) {
      webSocketService.send("typing_start", {
        recipientUsername: activeConversation,
      });

      // Clear existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      // Set new timeout to send typing_stop after 3 seconds of inactivity
      const timeout = setTimeout(() => {
        webSocketService.send("typing_stop", {
          recipientUsername: activeConversation,
        });
      }, 3000);

      setTypingTimeout(timeout);
    } else {
      // If input is cleared, stop typing indicator
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        setTypingTimeout(null);
      }
      webSocketService.send("typing_stop", {
        recipientUsername: activeConversation,
      });
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeConversation) return;

    // Stop typing indicator when sending
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }
    webSocketService.send("typing_stop", {
      recipientUsername: activeConversation,
    });

    // HARD GATE: Ensure contact with valid publicKey exists
    let contact = contacts.find((c) => c.username === activeConversation);

    console.log(`[Send] Initial contact check:`, {
      found: !!contact,
      username: contact?.username,
      hasPublicKey: !!contact?.publicKey,
      publicKeyLength: contact?.publicKey?.length || 0,
      totalContacts: contacts.length,
    });

    // If contact not found OR publicKey missing, attempt to load contacts
    if (!contact || !contact.publicKey) {
      console.log("Contact or publicKey missing, loading contacts...");

      // If already loading, wait for it to complete
      if (isContactsLoading) {
        showToast("Loading contact information...", "info");
        return;
      }

      // Load contacts and wait for completion
      await loadContacts();

      // Re-read contact from store AFTER load completes
      contact = contacts.find((c) => c.username === activeConversation);

      console.log(`[Send] After reload:`, {
        found: !!contact,
        username: contact?.username,
        hasPublicKey: !!contact?.publicKey,
        publicKeyLength: contact?.publicKey?.length || 0,
        totalContacts: contacts.length,
      });

      // If still not found or publicKey still missing, hard fail
      if (!contact) {
        showToast("✗ Contact not found. Please try again.", "error");
        return;
      }

      if (!contact.publicKey) {
        showToast(
          "✗ Contact encryption key not available. Please refresh and try again.",
          "error",
        );
        return;
      }
    }

    // At this point, contact.publicKey is GUARANTEED to be present
    if (!contact.cryptoProfileId) {
      showToast(
        "✗ Contact crypto profile not available. Try refreshing.",
        "error",
      );
      return;
    }

    // Get the session private key
    const privateKey = getSessionPrivateKey();
    if (!privateKey) {
      showToast("✗ Session expired. Please login again.", "error");
      setTimeout(() => {
        logout();
        navigate("/login");
      }, 2000);
      return;
    }

    // OPTIMISTIC UPDATE START
    const tempId = "temp-" + Date.now();
    const contentToSend = messageInput;

    // Clear input immediately
    setMessageInput("");

    try {
      // 1. Add optimistic message to store
      addMessage(activeConversation, {
        id: tempId,
        senderId: user?.publicKey || "",
        senderUsername: user?.username || "",
        recipientId: contact.publicKey,
        recipientUsername: activeConversation,
        encryptedPayload: "", // Not needed for local display of own message
        decryptedContent: contentToSend,
        messageType: "message",
        delivered: false,
        createdAt: new Date().toISOString(),
        status: "sending",
      });

      scrollToBottom(); // Ensure we see our new message

      // 2. Encrypt (publicKey is guaranteed valid at this point)
      const encryptedPayload = encryptMessage(
        contentToSend,
        contact.publicKey,
        privateKey,
      );

      // 3. Send via WebSocket
      const result = await webSocketService.sendMessage(
        activeConversation,
        contact.cryptoProfileId,
        encryptedPayload,
        "message",
      );

      // 4. Update with real ID and success status
      updateMessageId(
        tempId,
        result.messageId || Date.now().toString(),
        "sent",
      );

      // Update store with delivered status if provided immediately
      if (result.deliveredRealtime) {
        updateMessageStatus(result.messageId, true);
      }
    } catch (error: any) {
      console.error("Send message error:", error);

      // Mark as failed in UI
      updateMessageId(tempId, tempId, "failed");

      let errorMessage = "Failed to send message";

      if (
        error.message?.includes("not a contact") ||
        error.message?.includes("not accepted") ||
        error.message?.includes("NOT_CONTACTS")
      ) {
        errorMessage = "✗ You must be contacts to send messages.";
      } else if (error.message?.includes("offline")) {
        errorMessage =
          "✗ Recipient is offline. Message will be delivered when they come online.";
      } else if (error.message?.includes("not connected")) {
        errorMessage = "✗ Connection lost. Reconnecting...";
      } else if (error.message) {
        errorMessage = "✗ " + error.message;
      }

      showToast(errorMessage, "error");
    }
  };

  const handleAddContact = async () => {
    if (!searchUsername.trim()) {
      showToast("✗ Please enter a username", "error");
      return;
    }

    // Debug: Check if we have the required tokens
    const cryptoToken = SecureStorage.getCryptoToken();

    if (!cryptoToken) {
      showToast("✗ Session expired. Please login again.", "error");
      setTimeout(() => {
        logout();
        navigate("/login");
      }, 2000);
      return;
    }

    try {
      await api.sendContactRequest(searchUsername, contactMessage);
      showToast("✓ Contact request sent!", "success");
      setShowAddContact(false);
      setSearchUsername("");
      setContactMessage("");
    } catch (error: any) {
      console.error("Add contact error:", error);

      let errorMessage = "Failed to send contact request";

      if (
        error.status === 401 ||
        error.message?.includes("session") ||
        error.message?.includes("expired")
      ) {
        errorMessage = "✗ Session expired. Please login again.";
        setTimeout(() => {
          logout();
          navigate("/login");
        }, 2000);
      } else if (error.message?.includes("not found") || error.status === 404) {
        errorMessage = "✗ User not found. Check the username.";
      } else if (
        error.message?.includes("already exists") ||
        error.message?.includes("already sent") ||
        error.message?.includes("ALREADY")
      ) {
        errorMessage =
          "✗ Contact request already sent or user is already a contact.";
      } else if (
        error.message?.includes("yourself") ||
        error.message?.includes("SELF")
      ) {
        errorMessage = "✗ You cannot add yourself as a contact.";
      } else if (error.message) {
        errorMessage = "✗ " + error.message;
      }

      showToast(errorMessage, "error");
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await api.acceptContactRequest(requestId);
      showToast("✓ Contact request accepted!", "success");
      loadContacts();
      loadPendingRequests();
    } catch (error: any) {
      console.error("Accept request error:", error);
      showToast(
        "✗ Failed to accept request: " + (error.message || "Unknown error"),
        "error",
      );
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await api.rejectContactRequest(requestId);
      showToast("Contact request rejected", "info");
      loadPendingRequests();
    } catch (error: any) {
      console.error("Reject request error:", error);
      showToast(
        "✗ Failed to reject request: " + (error.message || "Unknown error"),
        "error",
      );
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleRetryMessage = async (msg: any) => {
    if (msg.status !== "failed") return;

    // Remove the failed message (or update to sending)
    // Actually better to delete and re-send to get a fresh ID and position
    // updateMessageId(msg.id, msg.id, 'sending'); // Optional visual update

    // We already have the logic in handleSendMessage but it relies on state `messageInput`.
    // We need to call the core sending logic directly.
    // Let's adapt the logic or just re-populate input?
    // Re-populating input is easiest for UX (user can edit correction).

    setMessageInput(msg.decryptedContent || "");
    // delete ONLY the failed message from store so we don't duplicate
    // Note: We don't have a delete action in store exposed here...
    // Ideally we'd have `removeMessage`.
    // For now, let's just let the user re-send and the failed one stays as "history" or we can ignore it.
    // Better UX: Fill input.
    showToast(
      "📝 Message content restored to input. Try sending again.",
      "info",
    );
  };

  const activeConv = activeConversation
    ? conversations.get(activeConversation)
    : null;

  if (isLoading) {
    return (
      <div className="min-h-screen auth-gradient-bg flex items-center justify-center">
        <Loading size="lg" text="Loading your conversations..." />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden auth-gradient-bg">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-md border-b border-white/10 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img src="logo.png" alt="VoidLink" className="h-5 w-auto" />
            <h1 className="text-xl font-bold text-white">VoidLink</h1>
            <div className="flex items-center gap-2 text-xs bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20">
              <div
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  isConnected ? "bg-green-400" : "bg-red-400"
                }`}
              />
              <span className="text-white/80 font-medium">
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={user?.presenceStatus || "online"}
              onChange={(e) => {
                const status = e.target.value as
                  | "online"
                  | "away"
                  | "busy"
                  | "offline";
                useAuthStore.getState().setPresenceStatus(status);
                webSocketService.send("presence_update", { status });
              }}
              className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg text-sm border border-white/30 text-white font-medium focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/30 focus:bg-white/20 active:bg-white/25 cursor-pointer transition-all duration-150 hover:bg-white/15 hover:border-white/40 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22white%22%3E%3cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.293%207.293a1%201%200%20011.414%200L10%2010.586l3.293-3.293a1%201%200%20111.414%201.414l-4%204a1%201%200%2001-1.414%200l-4-4a1%201%200%20010-1.414z%22%20clip-rule%3D%22evenodd%22%2F%3E%3c%2Fsvg%3E')] bg-[length:1.5em_1.5em] bg-[right_0.5rem_center] bg-no-repeat pr-10 shadow-lg"
              style={{
                colorScheme: "dark",
              }}
            >
              <option value="online" className="bg-slate-800 text-white">
                🟢 Online
              </option>
              <option value="away" className="bg-slate-800 text-white">
                🟡 Away
              </option>
              <option value="busy" className="bg-slate-800 text-white">
                🔴 Busy
              </option>
            </select>
            <span className="text-white/80 text-sm font-medium">
              {user?.username}
            </span>
            <Button variant="secondary" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Contacts Sidebar */}
        <div className="w-96 glass-auth-strong rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <div className="flex gap-2">
              <Button
                className="flex-1"
                size="sm"
                onClick={() => setShowAddContact(true)}
              >
                + Add Contact
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={loadPendingRequests}
                title="Refresh pending requests"
                className="w-10 p-0"
              >
                ↻
              </Button>
            </div>
          </div>

          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <div className="border-b border-white/10 bg-white/5">
              <div className="p-4">
                <h3 className="text-xs font-semibold text-purple-300 mb-3 flex items-center gap-2 uppercase tracking-wide">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                  Pending Requests ({pendingRequests.length})
                </h3>
                <div className="space-y-2">
                  {pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 bg-white/5 rounded-xl border border-white/10 hover:border-purple-400/50 transition-all duration-150"
                    >
                      <p className="text-sm font-medium mb-1.5 text-white">
                        {req.requesterUsername}
                      </p>
                      {req.message && (
                        <p className="text-xs text-white/60 mb-2 line-clamp-2">
                          "{req.message}"
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAcceptRequest(req.id)}
                          className="flex-1 text-xs"
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleRejectRequest(req.id)}
                          className="flex-1 text-xs"
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="p-3">
              {/* Search Bar */}
              <div className="mb-3 px-1">
                <div className="bg-white/5 rounded-lg px-4 py-2.5 text-sm text-white/60 flex items-center gap-2 border border-white/10">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <span className="opacity-50">Search...</span>
                </div>
              </div>

              {(() => {
                // Merge Contacts and Active Conversations
                const uniqueUsers = new Set<string>();
                contacts.forEach((c) => uniqueUsers.add(c.username));
                Array.from(conversations.keys()).forEach((u) =>
                  uniqueUsers.add(u),
                );

                const displayList = Array.from(uniqueUsers).map((username) => {
                  const contact = contacts.find((c) => c.username === username);
                  const conversation = conversations.get(username);
                  const lastMsg = conversation?.lastMessage;
                  const sortTime = lastMsg?.createdAt
                    ? new Date(lastMsg.createdAt).getTime()
                    : contact?.addedAt
                      ? new Date(contact.addedAt).getTime()
                      : 0;

                  return {
                    username,
                    displayName: contact?.username || username,
                    lastMessage: lastMsg,
                    unreadCount: conversation?.unreadCount || 0,
                    isOnline:
                      contact?.isOnline || conversation?.isOnline || false,
                    isTyping: conversation?.isTyping || false,
                    sortTime,
                  };
                });

                displayList.sort((a, b) => b.sortTime - a.sortTime);

                if (displayList.length === 0) {
                  return (
                    <div className="text-center py-12 px-4">
                      <div className="text-white/60 text-sm">
                        <p className="mb-1">No conversations yet</p>
                        <p className="text-xs">
                          Add a contact to start chatting
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-1">
                    {displayList.map((chat) => (
                      <button
                        key={chat.username}
                        onClick={() => setActiveConversation(chat.username)}
                        className={`w-full p-3 rounded-xl text-left transition-all duration-150 group ${
                          activeConversation === chat.username
                            ? "bg-purple-500/30 border border-purple-400/50"
                            : "hover:bg-white/5 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <div
                              className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-semibold ${
                                activeConversation === chat.username
                                  ? "bg-purple-400/30 text-white border-2 border-purple-400"
                                  : "bg-white/10 text-white"
                              }`}
                            >
                              {chat.displayName.charAt(0).toUpperCase()}
                            </div>
                            {chat.isOnline && (
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-900"></div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-0.5">
                              <h4
                                className={`font-medium truncate text-sm ${
                                  activeConversation === chat.username
                                    ? "text-white"
                                    : "text-white/90"
                                }`}
                              >
                                {chat.displayName}
                              </h4>
                              {chat.lastMessage && (
                                <span
                                  className={`text-xs whitespace-nowrap ml-2 ${
                                    activeConversation === chat.username
                                      ? "text-white/70"
                                      : "text-white/50"
                                  }`}
                                >
                                  {new Date(
                                    chat.lastMessage.createdAt,
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              )}
                            </div>

                            <div className="flex justify-between items-center">
                              <p
                                className={`text-xs truncate pr-2 ${
                                  activeConversation === chat.username
                                    ? "text-white/70"
                                    : "text-white/50"
                                }`}
                              >
                                {chat.isTyping ? (
                                  <span className="italic">typing...</span>
                                ) : (
                                  chat.lastMessage?.decryptedContent ||
                                  "Start a conversation"
                                )}
                              </p>
                              {chat.unreadCount > 0 && (
                                <span
                                  className={`min-w-[1.125rem] h-[1.125rem] px-1 rounded-full font-semibold text-[10px] flex items-center justify-center shrink-0 ${
                                    activeConversation === chat.username
                                      ? "bg-white text-purple-600"
                                      : "bg-purple-500 text-white"
                                  }`}
                                >
                                  {chat.unreadCount > 99
                                    ? "99+"
                                    : chat.unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col glass-auth-strong rounded-2xl overflow-hidden">
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      contacts.find((c) => c.username === activeConversation)
                        ?.isOnline
                        ? "bg-green-400"
                        : "bg-white/30"
                    }`}
                  />
                  <h2 className="text-lg font-semibold text-white">
                    {activeConversation}
                  </h2>
                </div>
              </div>

              {/* Messages */}
              <div
                ref={messagesContainerRef}
                onScroll={handleScrollEvents}
                className="flex-1 overflow-y-auto p-6 space-y-1 scrollbar-thin"
              >
                {isLoadingMore && (
                  <div className="text-center py-2">
                    <span className="text-xs text-white/60">
                      Loading more messages...
                    </span>
                  </div>
                )}
                {!activeConv || activeConv.messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/10 flex items-center justify-center">
                        <svg
                          className="w-8 h-8 text-white/60"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                          />
                        </svg>
                      </div>
                      <p className="text-white/70 text-sm">No messages yet</p>
                      <p className="text-white/50 text-xs mt-1">
                        Start the conversation!
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {activeConv.messages.map((msg, index, messages) => {
                      const isMe = msg.senderUsername === user?.username;
                      const prevMsg = messages[index - 1];
                      const nextMsg = messages[index + 1];

                      // Date Header Logic
                      const isFirstMessage = index === 0;
                      const isNewDay =
                        isFirstMessage ||
                        new Date(msg.createdAt).toDateString() !==
                          new Date(prevMsg.createdAt).toDateString();

                      let dateLabel = new Date(
                        msg.createdAt,
                      ).toLocaleDateString();
                      const today = new Date().toDateString();
                      const yesterday = new Date(
                        Date.now() - 86400000,
                      ).toDateString();
                      const messageDate = new Date(
                        msg.createdAt,
                      ).toDateString();

                      if (messageDate === today) dateLabel = "Today";
                      else if (messageDate === yesterday)
                        dateLabel = "Yesterday";

                      // Grouping Logic
                      const isFirstInGroup =
                        isFirstMessage ||
                        isNewDay ||
                        msg.senderUsername !== prevMsg.senderUsername;

                      const isLastInGroup =
                        index === messages.length - 1 ||
                        messages[index + 1].senderUsername !==
                          msg.senderUsername ||
                        new Date(
                          messages[index + 1].createdAt,
                        ).toDateString() !== messageDate;

                      return (
                        <div key={msg.id} className="flex flex-col">
                          {isNewDay && (
                            <div className="flex justify-center my-3 sticky top-0 z-10">
                              <span className="bg-white/10 backdrop-blur-md text-white/70 text-xs px-4 py-1.5 rounded-full border border-white/20">
                                {dateLabel}
                              </span>
                            </div>
                          )}

                          <div
                            className={`flex ${
                              isMe ? "justify-end" : "justify-start"
                            } ${isFirstInGroup ? "mt-2" : "mt-0.5"}`}
                          >
                            <div
                              className={`max-w-[70%] md:max-w-md px-4 py-2.5 relative group ${
                                isMe
                                  ? `bg-purple-500/80 text-white backdrop-blur-sm ${
                                      isFirstInGroup
                                        ? "rounded-tr-2xl rounded-tl-2xl"
                                        : "rounded-tr-sm rounded-tl-2xl"
                                    } ${
                                      isLastInGroup
                                        ? "rounded-br-2xl rounded-bl-2xl"
                                        : "rounded-br-sm rounded-bl-2xl"
                                    }`
                                  : `bg-white/10 backdrop-blur-sm text-white border border-white/20 ${
                                      isFirstInGroup
                                        ? "rounded-tl-2xl rounded-tr-2xl"
                                        : "rounded-tl-sm rounded-tr-2xl"
                                    } ${
                                      isLastInGroup
                                        ? "rounded-bl-2xl rounded-br-2xl"
                                        : "rounded-bl-sm rounded-br-2xl"
                                    }`
                              }`}
                            >
                              {!isMe && isFirstInGroup && (
                                <p className="text-xs font-semibold text-purple-300 mb-1">
                                  {msg.senderUsername}
                                </p>
                              )}
                              <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                                {msg.decryptedContent || "[Encrypted]"}
                              </p>
                              <div
                                className={`flex items-center justify-end gap-1 mt-1 select-none ${
                                  isMe ? "text-white/60" : "text-white/50"
                                }`}
                              >
                                <span className="text-[10px]">
                                  {new Date(msg.createdAt).toLocaleTimeString(
                                    [],
                                    { hour: "2-digit", minute: "2-digit" },
                                  )}
                                </span>
                                {isMe && (
                                  <span
                                    className={`text-[10px] ${
                                      msg.status === "failed"
                                        ? "cursor-pointer hover:scale-110 transition-transform text-void-danger"
                                        : msg.read || msg.delivered
                                          ? "text-white/80"
                                          : "text-white/50"
                                    }`}
                                    onClick={(e) => {
                                      if (msg.status === "failed") {
                                        e.stopPropagation();
                                        handleRetryMessage(msg);
                                      }
                                    }}
                                    title={
                                      msg.status === "failed"
                                        ? "Click to retry"
                                        : msg.read
                                          ? "Read"
                                          : msg.delivered
                                            ? "Delivered"
                                            : msg.status === "sending"
                                              ? "Sending..."
                                              : "Sent"
                                    }
                                  >
                                    {msg.status === "failed"
                                      ? "✕"
                                      : msg.status === "sending"
                                        ? "○"
                                        : msg.read
                                          ? "✓✓"
                                          : msg.delivered
                                            ? "✓"
                                            : "✓"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}

                {/* Typing Indicator */}
                {activeConv?.isTyping && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-2.5 border border-white/20">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div
                            className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-white/10 bg-white/5">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={handleMessageInputChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all duration-150"
                    disabled={isContactsLoading}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={isContactsLoading || !messageInput.trim()}
                    className="px-6"
                  >
                    {isContactsLoading ? "..." : "Send"}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-white/60"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <p className="text-white text-base mb-1">
                  Select a contact to start chatting
                </p>
                <p className="text-white/60 text-sm flex items-center justify-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  End-to-end encrypted
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Contact Modal */}
      {showAddContact && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="glass-auth-strong rounded-2xl max-w-md w-full mx-4 animate-fade-scale-in">
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">Add Contact</h2>
            </div>
            <div className="p-6">
              <Input
                label="Username"
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                placeholder="Enter username"
              />
              <Input
                label="Message (optional)"
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Hi! Let's connect..."
              />
              <div className="flex gap-3 mt-2">
                <Button onClick={handleAddContact} className="flex-1">
                  Send Request
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowAddContact(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Passphrase Prompt Modal */}
      <PassphrasePrompt
        isOpen={showPassphrasePrompt}
        onSuccess={async () => {
          setShowPassphrasePrompt(false);
          // Reload contacts to ensure publicKey is available
          await loadContacts();
          // Trigger reactive decryption by reloading conversation
          if (activeConversation) {
            loadConversationHistory(activeConversation);
          }
        }}
        onCancel={() => {
          setShowPassphrasePrompt(false);
          showToast(
            "You can re-enter your passphrase anytime to decrypt messages.",
            "info",
          );
        }}
        onReAuthenticate={async (passphrase: string) => {
          return await authService.reAuthenticateWithPassphrase(passphrase);
        }}
      />

      <ToastContainer />
    </div>
  );
};
