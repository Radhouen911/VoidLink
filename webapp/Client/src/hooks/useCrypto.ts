import { useState } from "react";
import { decryptMessage, encryptMessage } from "../crypto/encryption";
import {
  generateSigningKeyPair,
  importKeysFromBackup,
} from "../crypto/keyManagement";
import { signMessage, verifySignature } from "../crypto/signing";
import { SecureStorage } from "../crypto/storage";

// In-memory storage for decrypted private key (cleared on page refresh)
let cachedPrivateKey: string | null = null;

export const useCrypto = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  /**
   * Set the decrypted private key in memory for the session
   * This should be called after login with the passphrase
   */
  const setSessionPrivateKey = (privateKey: string) => {
    cachedPrivateKey = privateKey;
  };

  /**
   * Get the cached private key from memory
   */
  const getSessionPrivateKey = (): string | null => {
    return cachedPrivateKey;
  };

  /**
   * Clear the cached private key from memory
   */
  const clearSessionPrivateKey = () => {
    cachedPrivateKey = null;
  };

  /**
   * Decrypt private key with passphrase and cache it for the session
   */
  const unlockPrivateKey = (passphrase: string): boolean => {
    try {
      const encryptedKey = SecureStorage.getEncryptedPrivateKey();
      if (!encryptedKey) {
        throw new Error("No encrypted key found");
      }

      const privateKey = importKeysFromBackup(encryptedKey, passphrase);
      if (!privateKey) {
        return false;
      }

      cachedPrivateKey = privateKey;
      return true;
    } catch (error) {
      console.error("Failed to unlock private key:", error);
      return false;
    }
  };

  const generateKeys = async () => {
    setIsGenerating(true);
    try {
      const keyPair = generateSigningKeyPair();
      const publicKey = keyPair.publicKey;
      const privateKey = keyPair.privateKey;

      SecureStorage.setPublicKey(publicKey);
      // Store in session cache
      cachedPrivateKey = privateKey;

      return { publicKey, privateKey };
    } finally {
      setIsGenerating(false);
    }
  };

  const importKeys = (backupJson: string, password: string) => {
    try {
      const privateKey = importKeysFromBackup(backupJson, password);
      if (!privateKey) {
        throw new Error("Invalid backup or password");
      }

      // Store in session cache
      cachedPrivateKey = privateKey;
      const publicKey = SecureStorage.getPublicKey();

      return { publicKey: publicKey || "", privateKey };
    } catch (error) {
      throw new Error("Invalid private key");
    }
  };

  const encrypt = (message: string, recipientPublicKey: string): string => {
    const privateKey = cachedPrivateKey;
    if (!privateKey) {
      throw new Error("Private key not unlocked. Session may have expired.");
    }
    return encryptMessage(message, recipientPublicKey, privateKey);
  };

  const decrypt = (
    encryptedMessage: string,
    senderPublicKey: string
  ): string | null => {
    const privateKey = cachedPrivateKey;
    if (!privateKey) {
      throw new Error("Private key not unlocked. Session may have expired.");
    }
    return decryptMessage(encryptedMessage, senderPublicKey, privateKey);
  };

  const sign = (message: string): string => {
    const privateKey = cachedPrivateKey;
    if (!privateKey) {
      throw new Error("Private key not unlocked. Session may have expired.");
    }
    return signMessage(message, privateKey);
  };

  const verify = (
    message: string,
    signature: string,
    publicKey: string
  ): boolean => {
    return verifySignature(message, signature, publicKey);
  };

  return {
    generateKeys,
    importKeys,
    encrypt,
    decrypt,
    sign,
    verify,
    isGenerating,
    setSessionPrivateKey,
    getSessionPrivateKey,
    clearSessionPrivateKey,
    unlockPrivateKey,
  };
};
