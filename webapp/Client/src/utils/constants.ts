export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
export const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:5000/ws";

// Debug: Log the URLs being used
console.log("VoidLink API Configuration:");
console.log("API_URL:", API_URL);
console.log("WS_URL:", WS_URL);

export const ROUTES = {
  HOME: "/",
  REGISTER: "/register",
  LOGIN: "/login",
  BACKUP: "/backup",
  CHAT: "/chat",
  CONTACTS: "/contacts",
  SETTINGS: "/settings",
  PROFILE: "/profile/:username",
  NOT_FOUND: "/404",
} as const;

export const STORAGE_KEYS = {
  ACCOUNT_TOKEN: "voidlink_account_token",
  CRYPTO_TOKEN: "voidlink_crypto_token",
  PUBLIC_KEY: "voidlink_public_key",
  PRIVATE_KEY: "voidlink_private_key",
  USERNAME: "voidlink_username",
} as const;

export const SESSION_DURATION = {
  ACCOUNT: 24 * 60 * 60 * 1000, // 24 hours
  CRYPTO: 15 * 60 * 1000, // 15 minutes
} as const;

export const MESSAGE_TYPES = {
  TEXT: "message",
  TYPING: "typing",
  STOP_TYPING: "stop_typing",
  DELIVERED: "delivered",
  READ: "read",
} as const;

export const CONTACT_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  BLOCKED: "blocked",
} as const;
