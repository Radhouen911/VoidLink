import { create } from "zustand";

export interface Message {
  id: string;
  senderId: string;
  senderUsername: string;
  recipientId: string;
  recipientUsername: string;
  encryptedPayload: string;
  decryptedContent?: string;
  messageType: string;
  delivered: boolean;
  createdAt: string;
  deliveredAt?: string;
}

export interface Conversation {
  username: string;
  messages: Message[];
  unreadCount: number;
  lastMessage?: Message;
  isOnline: boolean;
  isTyping: boolean;
}

interface ChatState {
  conversations: Map<string, Conversation>;
  activeConversation: string | null;

  // Actions
  setActiveConversation: (username: string) => void;
  addMessage: (username: string, message: Message) => void;
  addMessages: (username: string, messages: Message[]) => void;
  updateMessageStatus: (messageId: string, delivered: boolean) => void;
  setUserOnline: (username: string, isOnline: boolean) => void;
  setUserTyping: (username: string, isTyping: boolean) => void;
  markConversationRead: (username: string) => void;
  clearConversation: (username: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: new Map(),
  activeConversation: null,

  setActiveConversation: (username) => {
    set({ activeConversation: username });
    get().markConversationRead(username);
  },

  addMessage: (username, message) => {
    const conversations = new Map(get().conversations);
    const conversation = conversations.get(username) || {
      username,
      messages: [],
      unreadCount: 0,
      isOnline: false,
      isTyping: false,
    };

    conversation.messages.push(message);
    conversation.lastMessage = message;

    // Increment unread count if not active conversation
    if (get().activeConversation !== username) {
      conversation.unreadCount++;
    }

    conversations.set(username, conversation);
    set({ conversations });
  },

  addMessages: (username, messages) => {
    const conversations = new Map(get().conversations);
    const conversation = conversations.get(username) || {
      username,
      messages: [],
      unreadCount: 0,
      isOnline: false,
      isTyping: false,
    };

    // Replace messages instead of prepending to avoid duplicates when polling
    // Keep track of existing message IDs
    const existingIds = new Set(conversation.messages.map((m) => m.id));
    const newMessages = messages.filter((m) => !existingIds.has(m.id));

    // Add only new messages
    conversation.messages = [...conversation.messages, ...newMessages];

    // Sort by createdAt to maintain chronological order
    conversation.messages.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    if (conversation.messages.length > 0) {
      conversation.lastMessage =
        conversation.messages[conversation.messages.length - 1];
    }

    conversations.set(username, conversation);
    set({ conversations });
  },

  updateMessageStatus: (messageId, delivered) => {
    const conversations = new Map(get().conversations);

    conversations.forEach((conversation) => {
      const message = conversation.messages.find((m) => m.id === messageId);
      if (message) {
        message.delivered = delivered;
        if (delivered) {
          message.deliveredAt = new Date().toISOString();
        }
      }
    });

    set({ conversations });
  },

  setUserOnline: (username, isOnline) => {
    const conversations = new Map(get().conversations);
    const conversation = conversations.get(username);

    if (conversation) {
      conversation.isOnline = isOnline;
      conversations.set(username, conversation);
      set({ conversations });
    }
  },

  setUserTyping: (username, isTyping) => {
    const conversations = new Map(get().conversations);
    const conversation = conversations.get(username);

    if (conversation) {
      conversation.isTyping = isTyping;
      conversations.set(username, conversation);
      set({ conversations });
    }
  },

  markConversationRead: (username) => {
    const conversations = new Map(get().conversations);
    const conversation = conversations.get(username);

    if (conversation) {
      conversation.unreadCount = 0;
      conversations.set(username, conversation);
      set({ conversations });
    }
  },

  clearConversation: (username) => {
    const conversations = new Map(get().conversations);
    conversations.delete(username);
    set({ conversations });
  },
}));
