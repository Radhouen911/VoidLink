import { SecureStorage } from "../crypto/storage";
import { useAuthStore } from "../store/authStore";

// Mock session private key storage
let mockSessionPrivateKey: string | null = null;

export const getSessionPrivateKey = () => {
  // In demo mode, always return a mock private key
  return (
    mockSessionPrivateKey ||
    "mock_demo_private_key_64_chars_long_ed25519_format_example_demo"
  );
};

export const setSessionPrivateKey = (key: string, passphrase?: string) => {
  mockSessionPrivateKey = key;
};

export const clearSessionPrivateKey = () => {
  mockSessionPrivateKey = null;
};

export class MockAuthService {
  /**
   * Mock register - accepts any credentials
   */
  async register(username: string, password: string, passphrase: string) {
    console.log("Mock register:", { username, password, passphrase });

    // Simulate delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (username === "demo") {
      // Store mock tokens
      const accountToken = "mock_account_token_" + Date.now();
      const cryptoToken = "mock_crypto_token_" + Date.now();

      SecureStorage.setAccountToken(accountToken);
      SecureStorage.setCryptoToken(cryptoToken);
      SecureStorage.setUsername(username);

      // Mock keys
      const publicKey =
        "mock_demo_public_key_64_chars_long_ed25519_format_example_demo";
      SecureStorage.setPublicKey(publicKey);

      // Update auth store
      useAuthStore.getState().setUser({ username, publicKey });
      useAuthStore.getState().setAccountToken(accountToken);
      useAuthStore.getState().setCryptoToken(cryptoToken);

      return { username, publicKey };
    }

    throw new Error("Username already exists");
  }

  /**
   * Mock login - accepts demo/demo123 with any passphrase
   */
  async login(username: string, password: string, passphrase: string) {
    console.log("Mock login:", { username, password, passphrase });

    // Simulate delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (username === "demo" && password === "demo123") {
      // Store mock tokens
      const accountToken = "mock_account_token_" + Date.now();
      const cryptoToken = "mock_crypto_token_" + Date.now();

      SecureStorage.setAccountToken(accountToken);
      SecureStorage.setCryptoToken(cryptoToken);
      SecureStorage.setUsername(username);

      // Mock keys
      const publicKey =
        "mock_demo_public_key_64_chars_long_ed25519_format_example_demo";
      SecureStorage.setPublicKey(publicKey);

      // Update auth store
      useAuthStore.getState().setUser({ username, publicKey });
      useAuthStore.getState().setAccountToken(accountToken);
      useAuthStore.getState().setCryptoToken(cryptoToken);

      return { username, publicKey };
    }

    throw new Error("Invalid username or password");
  }

  /**
   * Mock logout
   */
  async logout() {
    console.log("Mock logout");
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Clear all tokens
    SecureStorage.clearAccountToken();
    SecureStorage.clearCryptoToken();

    useAuthStore.getState().logout();
  }

  /**
   * Mock session validation
   */
  async validateSession(): Promise<boolean> {
    const token = SecureStorage.getAccountToken();
    return !!token;
  }

  /**
   * Mock re-authentication - always succeeds with any passphrase
   */
  async reAuthenticateWithPassphrase(passphrase: string): Promise<boolean> {
    console.log("Mock re-authenticate with passphrase:", passphrase);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const cryptoToken = "mock_crypto_token_" + Date.now();
    SecureStorage.setCryptoToken(cryptoToken);
    useAuthStore.getState().setCryptoToken(cryptoToken);

    return true;
  }

  /**
   * Mock get decrypted private key - returns mock key for any passphrase
   */
  async getDecryptedPrivateKey(passphrase: string): Promise<string> {
    console.log("Mock get decrypted private key with passphrase:", passphrase);
    await new Promise((resolve) => setTimeout(resolve, 200));

    return "mock_demo_private_key_64_chars_long_ed25519_format_example_demo";
  }

  /**
   * Mock complete crypto challenge
   */
  async completeCryptoChallenge(privateKey: string): Promise<string> {
    console.log("Mock complete crypto challenge");
    await new Promise((resolve) => setTimeout(resolve, 300));

    const cryptoToken = "mock_crypto_token_" + Date.now();
    return cryptoToken;
  }
}

export const mockAuthService = new MockAuthService();
