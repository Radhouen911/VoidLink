import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { Loading } from "../components/common/Loading";
import { useToast } from "../components/common/Toast";
import { decryptMessage, encryptMessage } from "../crypto/encryption";
import { SecureStorage } from "../crypto/storage";
import { useAuth } from "../hooks/useAuth";
import { useWebSocket } from "../hooks/useWebSocket";
import { api } from "../services/api";
import { getSessionPrivateKey } from "../services/auth";
import { websocket } from "../services/websocket";
import { useChatStore } from "../store/chatStore";
import { useContactStore } from "../store/contactStore";

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
  } = useChatStore();

  const [messageInput, setMessageInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showAddContact, setShowAddContact] = useState(false);
  const [searchUsername, setSearchUsername] = useState("");
  const [contactMessage, setContactMessage] = useState("");

  useEffect(() => {
    loadContacts();
    loadPendingRequests();

    // Poll for pending requests every 3 seconds
    const pollPendingInterval = setInterval(() => {
      loadPendingRequests();
    }, 3000);

    // Poll for contacts (to update online status) every 5 seconds
    const pollContactsInterval = setInterval(() => {
      loadContacts();
    }, 5000);

    return () => {
      clearInterval(pollPendingInterval);
      clearInterval(pollContactsInterval);
    };
  }, []);

  // Load conversation history when a contact is selected
  useEffect(() => {
    if (activeConversation) {
      loadConversationHistory(activeConversation);

      // Poll for new messages every 2 seconds while conversation is active
      const pollMessagesInterval = setInterval(() => {
        loadConversationHistory(activeConversation);
      }, 2000);

      return () => clearInterval(pollMessagesInterval);
    }
  }, [activeConversation]);

  const loadConversationHistory = async (username: string) => {
    try {
      const response: any = await api.getConversation(username, undefined, 50);
      const messagesData = response.data?.conversation || [];

      if (messagesData.length > 0) {
        console.log(`Loading ${messagesData.length} messages for ${username}`);

        // Get contact info for public key
        const contact = contacts.find((c) => c.username === username);
        if (!contact) {
          console.error("Contact not found for conversation:", username);
          return;
        }

        // Map backend format to frontend format
        // Backend returns: { messageId, encryptedPayload, messageType, direction, delivered, createdAt }
        // direction is "sent" or "received"
        const mappedMessages = messagesData.map((msg: any) => {
          const isSent = msg.direction === "sent";

          return {
            id: msg.messageId,
            senderId: isSent ? user?.publicKey || "" : contact.publicKey,
            senderUsername: isSent ? user?.username || "" : username,
            recipientId: isSent ? contact.publicKey : user?.publicKey || "",
            recipientUsername: isSent ? username : user?.username || "",
            encryptedPayload: msg.encryptedPayload,
            decryptedContent: "[Encrypted]", // Will decrypt on display
            messageType: msg.messageType || "message",
            delivered: msg.delivered || false,
            createdAt: msg.createdAt,
          };
        });

        // Add messages to store (backend returns newest first, reverse for chronological)
        addMessages(username, mappedMessages.reverse());
      }
    } catch (error: any) {
      console.error("Failed to load conversation:", error);
      // Don't show error toast - it's not critical
    }
  };

  // Decrypt a message for display
  const decryptMessageContent = (msg: any): string => {
    // If already decrypted, return it
    if (msg.decryptedContent && msg.decryptedContent !== "[Encrypted]") {
      return msg.decryptedContent;
    }

    // Get private key from session
    const privateKey = getSessionPrivateKey();
    if (!privateKey) {
      return "[Session expired - login to decrypt]";
    }

    // Get the other party's public key
    const contact = contacts.find(
      (c) =>
        c.username === msg.senderUsername ||
        c.username === msg.recipientUsername
    );

    if (!contact) {
      console.error("Contact not found for message:", {
        senderUsername: msg.senderUsername,
        recipientUsername: msg.recipientUsername,
        availableContacts: contacts.map((c) => c.username),
      });
      return "[Contact not found]";
    }

    // Determine if we're the sender or recipient
    const isSender = msg.senderUsername === user?.username;
    const otherPartyPublicKey = isSender ? msg.recipientId : msg.senderId;

    if (!otherPartyPublicKey) {
      console.error("Missing encryption key for message:", {
        isSender,
        senderId: msg.senderId,
        recipientId: msg.recipientId,
      });
      return "[Missing encryption key]";
    }

    console.log("Attempting to decrypt message:", {
      messageId: msg.id,
      isSender,
      otherPartyUsername: contact.username,
      otherPartyPublicKeyLength: otherPartyPublicKey?.length,
      myPrivateKeyLength: privateKey?.length,
    });

    try {
      const decrypted = decryptMessage(
        msg.encryptedPayload,
        otherPartyPublicKey,
        privateKey
      );
      console.log("Message decrypted successfully:", msg.id);
      return decrypted || "[Decryption failed]";
    } catch (error) {
      console.error("Decryption error:", {
        messageId: msg.id,
        error: error,
        otherPartyPublicKey: otherPartyPublicKey?.substring(0, 20) + "...",
      });
      return "[Decryption failed]";
    }
  };

  const loadContacts = async () => {
    try {
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

      console.log(
        "Loaded contacts with keys:",
        mappedContacts.map((c) => ({
          username: c.username,
          hasPublicKey: !!c.publicKey,
          publicKeyLength: c.publicKey?.length,
        }))
      );

      console.log("Loaded contacts:", mappedContacts);
      setContacts(mappedContacts);
    } catch (error: any) {
      console.error("Failed to load contacts:", error);
      showToast(
        "✗ Failed to load contacts: " + (error.message || "Unknown error"),
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadPendingRequests = async () => {
    try {
      console.log("Loading pending requests...");
      const response: any = await api.getPendingRequests();
      console.log("Pending requests response:", response);

      // Backend returns data.pendingRequests, not data.requests
      const requests = response.data?.pendingRequests || [];
      console.log("Pending requests array:", requests);

      // Map backend format to frontend format
      const mappedRequests = requests.map((req: any) => ({
        id: req.requestId,
        requesterUsername: req.requesterUsername,
        requesterPublicKey: req.requesterPublicKey || "",
        message: req.message,
        createdAt: req.receivedAt,
      }));

      setPendingRequests(mappedRequests);
      console.log("Set pending requests count:", mappedRequests.length);
    } catch (error: any) {
      console.error("Failed to load pending requests:", error);
      showToast("✗ Failed to load pending requests", "error");
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeConversation) return;

    const contact = contacts.find((c) => c.username === activeConversation);
    if (!contact) {
      showToast("✗ Contact not found", "error");
      return;
    }

    if (!contact.publicKey) {
      showToast("✗ Contact public key not available. Try refreshing.", "error");
      console.error("Contact missing public key:", contact);
      return;
    }

    if (!contact.cryptoProfileId) {
      showToast(
        "✗ Contact crypto profile not available. Try refreshing.",
        "error"
      );
      console.error("Contact missing cryptoProfileId:", contact);
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

    try {
      console.log(
        "Encrypting message for:",
        contact.username,
        "with recipient public key:",
        contact.publicKey.substring(0, 20) + "...",
        "length:",
        contact.publicKey.length
      );

      // Use proper encryption with sender's private key
      const encryptedPayload = encryptMessage(
        messageInput,
        contact.publicKey,
        privateKey
      );
      console.log(
        "Encrypted payload created, length:",
        encryptedPayload.length
      );

      // Send via WebSocket instead of REST API
      const result = await websocket.sendMessage(
        activeConversation,
        contact.cryptoProfileId,
        encryptedPayload,
        "message"
      );

      console.log("Message sent via WebSocket:", result);

      addMessage(activeConversation, {
        id: result.messageId || Date.now().toString(),
        senderId: user?.publicKey || "",
        senderUsername: user?.username || "",
        recipientId: contact.publicKey,
        recipientUsername: activeConversation,
        encryptedPayload,
        decryptedContent: messageInput,
        messageType: "message",
        delivered: result.deliveredRealtime || false,
        createdAt: result.sentAt || new Date().toISOString(),
      });

      setMessageInput("");
      showToast("✓ Message sent", "success");
    } catch (error: any) {
      console.error("Send message error:", error);

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
        "error"
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
        "error"
      );
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const activeConv = activeConversation
    ? conversations.get(activeConversation)
    : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-void-black flex items-center justify-center">
        <Loading size="lg" text="Loading your conversations..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void-black text-void-text flex flex-col">
      {/* Header */}
      <div className="border-b border-void-purple bg-void-dark">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">VoidLink</h1>
            <div className="flex items-center gap-2 text-sm">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-void-success" : "bg-void-danger"
                }`}
              />
              <span className="text-void-text-dim">
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-void-text-dim">{user?.username}</span>
            <Button variant="secondary" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Contacts Sidebar */}
        <div className="w-80 border-r border-void-purple bg-void-dark flex flex-col">
          <div className="p-4 border-b border-void-purple">
            <Button
              className="w-full"
              size="sm"
              onClick={() => setShowAddContact(true)}
            >
              + Add Contact
            </Button>
          </div>

          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <div className="border-b border-void-purple">
              <div className="p-4">
                <h3 className="text-sm font-semibold text-void-accent mb-3">
                  Pending Requests ({pendingRequests.length})
                </h3>
                <div className="space-y-2">
                  {pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 bg-void-black rounded-lg border border-void-purple/50 hover:border-void-purple transition-colors"
                    >
                      <p className="text-sm font-medium mb-2">
                        {req.requesterUsername}
                      </p>
                      {req.message && (
                        <p className="text-xs text-void-text-dim mb-3">
                          "{req.message}"
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAcceptRequest(req.id)}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleRejectRequest(req.id)}
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

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-void-text-dim mb-3">
                Contacts ({contacts.length})
              </h3>
              {contacts.length === 0 ? (
                <p className="text-sm text-void-text-dim text-center py-8">
                  No contacts yet. Add someone to start chatting!
                </p>
              ) : (
                <div className="space-y-2">
                  {contacts.map((contact) => (
                    <button
                      key={contact.username}
                      onClick={() => setActiveConversation(contact.username)}
                      className={`w-full p-4 rounded-lg text-left transition-all ${
                        activeConversation === contact.username
                          ? "bg-void-purple shadow-lg"
                          : "bg-void-black hover:bg-void-purple/50"
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-1">
                        <div
                          className={`w-2.5 h-2.5 rounded-full ${
                            contact.isOnline
                              ? "bg-void-success animate-pulse"
                              : "bg-gray-500"
                          }`}
                        />
                        <span className="font-medium text-base">
                          {contact.username}
                        </span>
                      </div>
                      <p className="text-xs text-void-text-dim ml-5">
                        {contact.isOnline ? "Online" : "Offline"}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-void-purple bg-void-dark">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      contacts.find((c) => c.username === activeConversation)
                        ?.isOnline
                        ? "bg-void-success"
                        : "bg-gray-500"
                    }`}
                  />
                  <h2 className="text-xl font-semibold">
                    {activeConversation}
                  </h2>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {!activeConv || activeConv.messages.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-void-text-dim">
                      No messages yet. Start the conversation!
                    </p>
                  </div>
                ) : (
                  activeConv.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.senderUsername === user?.username
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-md p-4 rounded-2xl shadow-md ${
                          msg.senderUsername === user?.username
                            ? "bg-void-accent text-void-black"
                            : "bg-void-purple text-void-text"
                        }`}
                      >
                        <p className="text-sm leading-relaxed">
                          {decryptMessageContent(msg)}
                        </p>
                        <p className="text-xs opacity-70 mt-2">
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Message Input */}
              <div className="p-6 border-t border-void-purple bg-void-dark">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-3 bg-void-black border border-void-purple rounded-lg focus:outline-none focus:border-void-accent transition-colors"
                  />
                  <Button onClick={handleSendMessage} className="px-6">
                    Send
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-void-text-dim text-lg mb-2">
                  Select a contact to start chatting
                </p>
                <p className="text-void-text-dim text-sm">
                  Your messages are end-to-end encrypted
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Contact Modal */}
      {showAddContact && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="card max-w-md w-full mx-4 p-6">
            <h2 className="text-2xl font-bold mb-4">Add Contact</h2>
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
            <div className="flex gap-2 mt-4">
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
      )}
      <ToastContainer />
    </div>
  );
};
