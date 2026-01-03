import {
  exportKeysAsBackup,
  generateSigningKeyPair,
  importKeysFromBackup,
} from "../crypto/keyManagement";
import { signChallenge } from "../crypto/signing";
import { SecureStorage } from "../crypto/storage";
import { useAuthStore } from "../store/authStore";
import { api } from "./api";

export class AuthService {
  /**
   * Register new account
   * Passphrase is REQUIRED to encrypt private key
   */
  async register(username: string, password: string, passphrase: string) {
    // Step 1: Register account
    const registerResponse: any = await api.register(username, password);
    console.log("Register response:", registerResponse);

    // Step 2: Login to get session token
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
    const keyPair = generateSigningKeyPair();
    const publicKey = keyPair.publicKey;
    const privateKey = keyPair.privateKey;

    console.log("Generated keys:", {
      publicKeyLength: publicKey.length,
      privateKeyLength: privateKey.length,
    });

    // Step 4: Encrypt private key with passphrase
    const encryptedPrivateKey = exportKeysAsBackup(privateKey, passphrase);

    // Store encrypted private key locally
    SecureStorage.setEncryptedPrivateKey(encryptedPrivateKey);
    SecureStorage.setPublicKey(publicKey);

    // Step 5: Upload public key to server
    await api.uploadPublicKey(publicKey);

    // Step 6: Upload encrypted private key backup to server
    await api.enableBackup(encryptedPrivateKey);
    console.log("Cloud backup enabled with encrypted private key");

    // Step 7: Complete crypto challenge (decrypt key temporarily for signing)
    const cryptoToken = await this.completeCryptoChallenge(privateKey);

    // Update auth store
    useAuthStore.getState().setUser({ username, publicKey });
    useAuthStore.getState().setAccountToken(accountToken);
    useAuthStore.getState().setCryptoToken(cryptoToken);

    return { username, publicKey };
  }

  /**
   * Login - works from any device
   * Passphrase is REQUIRED to decrypt private key
   */
  async login(username: string, password: string, passphrase: string) {
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
        throw new Error("Public key not found in local storage");
      }
    } else {
      console.log("No local key found, fetching from server");

      // Step 3: Fetch encrypted backup from server
      const backupResponse: any = await api.fetchBackup();
      const serverEncryptedKey = backupResponse.data?.encryptedPrivateKey;

      if (!serverEncryptedKey) {
        throw new Error(
          "No backup found on server. Cannot login from this device."
        );
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
    }

    // Step 4: Complete crypto challenge (private key only in memory)
    const cryptoToken = await this.completeCryptoChallenge(privateKey);

    // Clear private key from memory (it's only needed for challenge)
    privateKey = "";

    // Update auth store
    useAuthStore.getState().setUser({ username, publicKey });
    useAuthStore.getState().setAccountToken(accountToken);
    useAuthStore.getState().setCryptoToken(cryptoToken);

    return { username, publicKey };
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
}

export const authService = new AuthService();
