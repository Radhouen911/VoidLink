import { create } from "zustand";

export interface Contact {
  username: string;
  publicKey: string;
  contactStatus: string;
  isOnline: boolean;
  addedAt: string;
  acceptedAt?: string;
}

export interface ContactRequest {
  id: string;
  requesterUsername: string;
  requesterPublicKey: string;
  message?: string;
  createdAt: string;
}

interface ContactState {
  contacts: Contact[];
  pendingRequests: ContactRequest[];
  isLoading: boolean;

  // Actions
  setContacts: (contacts: Contact[]) => void;
  setPendingRequests: (requests: ContactRequest[]) => void;
  addContact: (contact: Contact) => void;
  removeContact: (username: string) => void;
  updateContactStatus: (username: string, isOnline: boolean) => void;
  removePendingRequest: (requestId: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useContactStore = create<ContactState>((set, get) => ({
  contacts: [],
  pendingRequests: [],
  isLoading: false,

  setContacts: (contacts) => set({ contacts }),

  setPendingRequests: (requests) => set({ pendingRequests: requests }),

  addContact: (contact) => {
    const contacts = [...get().contacts, contact];
    set({ contacts });
  },

  removeContact: (username) => {
    const contacts = get().contacts.filter((c) => c.username !== username);
    set({ contacts });
  },

  updateContactStatus: (username, isOnline) => {
    const contacts = get().contacts.map((c) =>
      c.username === username ? { ...c, isOnline } : c
    );
    set({ contacts });
  },

  removePendingRequest: (requestId) => {
    const pendingRequests = get().pendingRequests.filter(
      (r) => r.id !== requestId
    );
    set({ pendingRequests });
  },

  setLoading: (loading) => set({ isLoading: loading }),
}));
