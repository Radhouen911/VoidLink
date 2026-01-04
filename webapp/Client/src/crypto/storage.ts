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
  ACCOUNT_ID: "voidlink_account_id",
  CRYPTO_PROFILE_ID: "voidlink_crypto_profile_id",
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
   * Store account ID
   */
  static setAccountId(accountId: string): void {
    localStorage.setItem(STORAGE_KEYS.ACCOUNT_ID, accountId);
  }

  /**
   * Get account ID
   */
  static getAccountId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACCOUNT_ID);
  }

  /**
   * Store crypto profile ID
   */
  static setCryptoProfileId(cryptoProfileId: string): void {
    localStorage.setItem(STORAGE_KEYS.CRYPTO_PROFILE_ID, cryptoProfileId);
  }

  /**
   * Get crypto profile ID
   */
  static getCryptoProfileId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.CRYPTO_PROFILE_ID);
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
   * Check if user has valid session tokens
   */
  static hasValidSession(): boolean {
    return !!this.getAccountToken() && !!this.getCryptoToken();
  }

  /**
   * Clear account token
   */
  static clearAccountToken(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCOUNT_TOKEN);
  }

  /**
   * Clear crypto token
   */
  static clearCryptoToken(): void {
    localStorage.removeItem(STORAGE_KEYS.CRYPTO_TOKEN);
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
