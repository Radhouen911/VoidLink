import { create } from "zustand";
import { SecureStorage } from "../crypto/storage";

interface User {
  username: string;
  publicKey: string;
  cryptoProfileId?: string;
  presenceStatus?: "online" | "away" | "busy" | "offline";
}

interface AuthState {
  user: User | null;
  accountToken: string | null;
  cryptoToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: User) => void;
  setAccountToken: (token: string) => void;
  setCryptoToken: (token: string) => void;
  setPresenceStatus: (status: "online" | "away" | "busy" | "offline") => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accountToken: null,
  cryptoToken: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: true }),

  setAccountToken: (token) => {
    SecureStorage.setAccountToken(token);
    set({ accountToken: token });
  },

  setCryptoToken: (token) => {
    SecureStorage.setCryptoToken(token);
    set({ cryptoToken: token });
  },

  setPresenceStatus: (status) => {
    set((state) => ({
      user: state.user ? { ...state.user, presenceStatus: status } : null,
    }));
  },

  logout: () => {
    SecureStorage.logout();
    set({
      user: null,
      accountToken: null,
      cryptoToken: null,
      isAuthenticated: false,
    });
  },

  initialize: () => {
    const accountToken = SecureStorage.getAccountToken();
    const cryptoToken = SecureStorage.getCryptoToken();
    const username = SecureStorage.getUsername();
    const publicKey = SecureStorage.getPublicKey();

    if (accountToken && username && publicKey) {
      set({
        user: { username, publicKey },
        accountToken,
        cryptoToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      set({ isLoading: false });
    }
  },
}));
