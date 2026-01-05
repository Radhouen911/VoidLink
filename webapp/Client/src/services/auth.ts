import {
  exportKeysAsBackup,
  generateSigningKeyPair,
  importKeysFromBackup,
} from "../crypto/keyManagement";
import { signChallenge } from "../crypto/signing";
import { SecureStorage } from "../crypto/storage";
import { useAuthStore } from "../store/authStore";
import { api } from "./api";

// In-memory storage for decrypted private key (cleared on page refresh)
let sessionPrivateKey: string | null = null;

// Session storage for passphrase (cleared on tab close, persists on refresh)
const SESSION_PASSPHRASE_KEY = "voidlink_session_passphrase";

export const getSessionPrivateKey = () => {
  // If private key is in memory, return it
  if (sessionPrivateKey) {
    return sessionPrivateKey;
  }

  // Try to restore from encrypted key + session passphrase
  const passphrase = sessionStorage.getItem(SESSION_PASSPHRASE_KEY);
  const encryptedKey = SecureStorage.getEncryptedPrivateKey();

  if (passphrase && encryptedKey) {
    try {
      const privateKey = importKeysFromBackup(encryptedKey, passphrase);
      if (privateKey) {
        sessionPrivateKey = privateKey;
        return privateKey;
      }
    } catch (error) {
      console.error("Failed to restore private key from session:", error);
    }
  }

  return null;
};

export const setSessionPrivateKey = (key: string, passphrase?: string) => {
  sessionPrivateKey = key;
  // Store passphrase in sessionStorage for refresh recovery
  if (passphrase) {
    sessionStorage.setItem(SESSION_PASSPHRASE_KEY, passphrase);
  }
};

export const clearSessionPrivateKey = () => {
  sessionPrivateKey = null;
  sessionStorage.removeItem(SESSION_PASSPHRASE_KEY);
};

export class AuthService {
  /**
   * Register new account
   * Passphrase is REQUIRED to encrypt private key
   */
  async register(username: string, password: string, passphrase: string) {
    try {
      // Step 1: Register account
      console.log("Step 1: Registering account...");
      const registerResponse: any = await api.register(username, password);
      console.log("Register response:", registerResponse);

      // Step 2: Login to get session token
      console.log("Step 2: Logging in...");
      const loginResponse: any = await api.login(username, password);
      console.log("Login after register:", loginResponse);

      const accountToken = loginResponse.data?.accountSessionToken;

      if (!accountToken) {
        throw new Error("Failed to get account token after registration");
      }

      // Store account token
      SecureStorage.setAccountToken(accountToken);
      SecureStorage.setUsername(username);

      // Step 3: Generate crypto keys
      console.log("Step 3: Generating keys...");
      const keyPair = generateSigningKeyPair();
      const publicKey = keyPair.publicKey;
      const privateKey = keyPair.privateKey;

      console.log("Generated keys:", {
        publicKeyLength: publicKey.length,
        privateKeyLength: privateKey.length,
      });

      // Step 4: Encrypt private key with passphrase
      console.log("Step 4: Encrypting private key...");
      let encryptedPrivateKey: string;
      try {
        encryptedPrivateKey = exportKeysAsBackup(privateKey, passphrase);
        console.log("Private key encrypted successfully");
      } catch (error) {
        console.error("Encryption error:", error);
        throw new Error(
          "Failed to encrypt private key: " + (error as Error).message
        );
      }

      // Store encrypted private key locally
      SecureStorage.setEncryptedPrivateKey(encryptedPrivateKey);
      SecureStorage.setPublicKey(publicKey);

      // Step 5: Upload public key to server
      console.log("Step 5: Uploading public key...");
      const uploadResponse: any = await api.uploadPublicKey(publicKey);
      console.log("Public key uploaded:", uploadResponse);

      // Step 6: Upload encrypted private key backup to server
      console.log("Step 6: Enabling cloud backup...");
      const backupResponse: any = await api.enableBackup(encryptedPrivateKey);
      console.log("Cloud backup enabled:", backupResponse);

      // Step 7: Complete crypto challenge (decrypt key temporarily for signing)
      console.log("Step 7: Completing crypto challenge...");
      const cryptoToken = await this.completeCryptoChallenge(privateKey);
      console.log("Crypto challenge completed, token:", cryptoToken);

      // Cache private key in memory for the session
      sessionPrivateKey = privateKey;
      setSessionPrivateKey(privateKey, passphrase);

      // Update auth store
      useAuthStore.getState().setUser({ username, publicKey });
      useAuthStore.getState().setAccountToken(accountToken);
      useAuthStore.getState().setCryptoToken(cryptoToken);

      console.log("Registration complete!");
      return { username, publicKey };
    } catch (error: any) {
      console.error("Registration failed at step:", error);

      // Handle existing username by attempting login (Resume flow)
      if (
        error.response?.data?.error === "USERNAME_EXISTS" ||
        error.message?.includes("Username already exists")
      ) {
        console.log("Username exists, attempting login to resume setup...");
        try {
          return await this.login(username, password, passphrase);
        } catch (loginError) {
          // If login also fails, throw the original registration error
          throw error;
        }
      }

      throw error;
    }
  }

  /**
   * Login - works from any device
   * Passphrase is REQUIRED to decrypt private key
   */
  async login(username: string, password: string, passphrase: string) {
    // Clear any existing session tokens to prevent stale auth headers
    // Do NOT clear keys/username, as we need them for local decryption
    SecureStorage.clearAccountToken();
    SecureStorage.clearCryptoToken();

    // Step 1: Login to account
    const loginResponse: any = await api.login(username, password);
    console.log("Login response:", loginResponse);

    const accountToken = loginResponse.data?.accountSessionToken;

    if (!accountToken) {
      throw new Error("Failed to get account token from login");
    }

    // Store account token
    SecureStorage.setAccountToken(accountToken);
    SecureStorage.setUsername(username);

    let privateKey: string;
    let publicKey: string;

    // Step 2: Try to get encrypted key from localStorage first
    const localEncryptedKey = SecureStorage.getEncryptedPrivateKey();

    if (localEncryptedKey) {
      console.log("Using local encrypted key");

      // Decrypt local key with passphrase
      privateKey = importKeysFromBackup(localEncryptedKey, passphrase) || "";

      if (!privateKey) {
        throw new Error("Failed to decrypt local key. Incorrect passphrase.");
      }

      // Get public key from local storage
      publicKey = SecureStorage.getPublicKey() || "";

      if (!publicKey) {
        // Try fetch public key from server if missing locally
        try {
          const userInfo: any = await api.getUserByUsername(username);
          publicKey = userInfo.data?.publicKey;
          if (publicKey) SecureStorage.setPublicKey(publicKey);
        } catch (e) {
          console.warn("Could not recover public key from server");
        }

        if (!publicKey) {
          throw new Error("Public key not found in local storage or server");
        }
      }
    } else {
      console.log("No local key found, fetching from server");

      try {
        // Step 3: Fetch encrypted backup from server
        const backupResponse: any = await api.fetchBackup();
        const serverEncryptedKey = backupResponse.data?.encryptedPrivateKey;

        if (!serverEncryptedKey) {
          throw new Error("NO_BACKUP");
        }

        // Decrypt server backup with passphrase
        privateKey = importKeysFromBackup(serverEncryptedKey, passphrase) || "";

        if (!privateKey) {
          throw new Error(
            "Failed to decrypt server backup. Incorrect passphrase."
          );
        }

        // Get public key from server
        const userInfo: any = await api.getUserByUsername(username);
        publicKey = userInfo.data?.publicKey;

        if (!publicKey) {
          throw new Error("Failed to retrieve public key from server");
        }

        // Store encrypted key locally for future logins
        SecureStorage.setEncryptedPrivateKey(serverEncryptedKey);
        SecureStorage.setPublicKey(publicKey);

        console.log("Keys downloaded and stored locally (encrypted)");
      } catch (error: any) {
        // Handle case where account exists but keys are missing (Zombie account repair)
        if (
          error.message === "NO_BACKUP" ||
          error.response?.status === 404 ||
          error.message?.includes("No backup found")
        ) {
          console.log(
            "Account exists but no keys found. Attempting repair/setup..."
          );

          // Check if public key exists (if it does, we lost the private key = FATAL)
          try {
            const userInfo: any = await api.getUserByUsername(username);
            if (userInfo.data?.publicKey) {
              throw new Error(
                "Account exists with a PUBLIC key, but you have no backup of the PRIVATE key. This account is unrecoverable."
              );
            }
          } catch (e) {
            // If 404 on get user, or no public key, we can proceed to generate new ones
          }

          // If we are here, we have a valid account session but no keys.
          // Let's generate them!
          console.log("Generating new keys for incomplete account...");
          const keyPair = generateSigningKeyPair();
          publicKey = keyPair.publicKey;
          privateKey = keyPair.privateKey;

          // Encrypt private key with passphrase
          let encryptedPrivateKey: string;
          try {
            encryptedPrivateKey = exportKeysAsBackup(privateKey, passphrase);
          } catch (encError) {
            throw new Error("Failed to encrypt new private key");
          }

          // Upload keys
          await api.uploadPublicKey(publicKey);
          await api.enableBackup(encryptedPrivateKey);

          // Store locally
          SecureStorage.setEncryptedPrivateKey(encryptedPrivateKey);
          SecureStorage.setPublicKey(publicKey);

          console.log("Account repair/setup complete!");
        } else {
          throw error;
        }
      }
    }

    // Step 4: Complete crypto challenge (private key only in memory)
    const cryptoToken = await this.completeCryptoChallenge(privateKey!); // Non-null assertion as logic guarantees it

    // Cache private key in memory for the session (don't clear it!)
    sessionPrivateKey = privateKey!;
    setSessionPrivateKey(privateKey!, passphrase);

    // Update auth store
    useAuthStore.getState().setUser({ username, publicKey: publicKey! });
    useAuthStore.getState().setAccountToken(accountToken);
    useAuthStore.getState().setCryptoToken(cryptoToken);

    return { username, publicKey: publicKey! };
  }

  /**
   * Complete crypto challenge
   * Private key is only in memory temporarily
   */
  async completeCryptoChallenge(privateKey: string): Promise<string> {
    // Get challenge from server
    const challengeResponse: any = await api.getChallenge();
    const challenge = challengeResponse.data?.challenge;

    if (!challenge) {
      throw new Error("Failed to get challenge from server");
    }

    // Sign challenge with private key
    const signature = signChallenge(challenge, privateKey);

    // Verify challenge
    const verifyResponse: any = await api.verifyChallenge(challenge, signature);
    const cryptoToken = verifyResponse.data?.cryptoSessionToken;

    if (!cryptoToken) {
      throw new Error("Failed to get crypto token from verification");
    }

    return cryptoToken;
  }

  /**
   * Get decrypted private key for crypto operations
   * User must provide passphrase each time
   */
  async getDecryptedPrivateKey(passphrase: string): Promise<string> {
    const encryptedKey = SecureStorage.getEncryptedPrivateKey();

    if (!encryptedKey) {
      throw new Error("No encrypted key found. Please login first.");
    }

    const privateKey = importKeysFromBackup(encryptedKey, passphrase);

    if (!privateKey) {
      throw new Error("Failed to decrypt private key. Incorrect passphrase.");
    }

    return privateKey;
  }

  async logout() {
    try {
      await api.logout();
    } catch (error) {
      console.error("Logout API call failed:", error);
    } finally {
      // Clear session private key from memory
      clearSessionPrivateKey();
      useAuthStore.getState().logout();
    }
  }

  async validateSession(): Promise<boolean> {
    try {
      await api.validateSession();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Re-authenticate with passphrase after session expired
   * Used when user refreshes page and passphrase is cleared from sessionStorage
   */
  async reAuthenticateWithPassphrase(passphrase: string): Promise<boolean> {
    try {
      // Get encrypted private key from localStorage
      const encryptedKey = SecureStorage.getEncryptedPrivateKey();

      if (!encryptedKey) {
        throw new Error("No encrypted key found. Please login again.");
      }

      // Try to decrypt with provided passphrase
      const privateKey = importKeysFromBackup(encryptedKey, passphrase);

      if (!privateKey) {
        // Incorrect passphrase
        return false;
      }

      // Complete crypto challenge to get new crypto session
      const cryptoToken = await this.completeCryptoChallenge(privateKey);

      // Cache private key in memory for the session
      setSessionPrivateKey(privateKey, passphrase);

      // Update auth store with new crypto token
      useAuthStore.getState().setCryptoToken(cryptoToken);

      console.log("Re-authentication successful");
      return true;
    } catch (error) {
      console.error("Re-authentication failed:", error);
      return false;
    }
  }
}

export const authService = new AuthService();
