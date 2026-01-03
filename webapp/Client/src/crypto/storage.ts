/**
 * Secure Storage for VoidLink
 * Handles encrypted storage of private keys and session tokens
 */

const STORAGE_KEYS = {
  ACCOUNT_TOKEN: "voidlink_account_token",
  CRYPTO_TOKEN: "voidlink_crypto_token",
  PUBLIC_KEY: "voidlink_public_key",
  ENCRYPTED_PRIVATE_KEY: "voidlink_encrypted_private_key", // Always encrypted
  USERNAME: "voidlink_username",
} as const;

export class SecureStorage {
  /**
   * Store encrypted private key (NEVER store unencrypted)
   */
  static setEncryptedPrivateKey(encryptedKey: string): void {
    localStorage.setItem(STORAGE_KEYS.ENCRYPTED_PRIVATE_KEY, encryptedKey);
  }

  /**
   * Get encrypted private key
   */
  static getEncryptedPrivateKey(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ENCRYPTED_PRIVATE_KEY);
  }

  /**
   * Store public key (unencrypted - it's public)
   */
  static setPublicKey(publicKey: string): void {
    localStorage.setItem(STORAGE_KEYS.PUBLIC_KEY, publicKey);
  }

  /**
   * Get public key
   */
  static getPublicKey(): string | null {
    return localStorage.getItem(STORAGE_KEYS.PUBLIC_KEY);
  }

  /**
   * Store account session token
   */
  static setAccountToken(token: string): void {
    localStorage.setItem(STORAGE_KEYS.ACCOUNT_TOKEN, token);
  }

  /**
   * Get account session token
   */
  static getAccountToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACCOUNT_TOKEN);
  }

  /**
   * Store crypto session token
   */
  static setCryptoToken(token: string): void {
    localStorage.setItem(STORAGE_KEYS.CRYPTO_TOKEN, token);
  }

  /**
   * Get crypto session token
   */
  static getCryptoToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.CRYPTO_TOKEN);
  }

  /**
   * Store username
   */
  static setUsername(username: string): void {
    localStorage.setItem(STORAGE_KEYS.USERNAME, username);
  }

  /**
   * Get username
   */
  static getUsername(): string | null {
    return localStorage.getItem(STORAGE_KEYS.USERNAME);
  }

  /**
   * Check if user has encrypted keys stored locally
   */
  static hasLocalKeys(): boolean {
    return (
      !!this.getEncryptedPrivateKey() &&
      !!this.getPublicKey() &&
      !!this.getUsername()
    );
  }

  /**
   * Clear all stored data (logout)
   */
  static logout(): void {
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
  }

  /**
   * DEPRECATED: These methods should not be used
   * Private keys must always be encrypted
   */
  static setPrivateKey(): never {
    throw new Error(
      "Private keys must be encrypted. Use setEncryptedPrivateKey()"
    );
  }

  static getPrivateKey(): never {
    throw new Error(
      "Private keys must be encrypted. Use getEncryptedPrivateKey()"
    );
  }
}
