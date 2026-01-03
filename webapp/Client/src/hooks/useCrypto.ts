import { useState } from "react";
import { decryptMessage, encryptMessage } from "../crypto/encryption";
import {
  generateSigningKeyPair,
  importKeysFromBackup,
} from "../crypto/keyManagement";
import { signMessage, verifySignature } from "../crypto/signing";
import { SecureStorage } from "../crypto/storage";

export const useCrypto = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateKeys = async () => {
    setIsGenerating(true);
    try {
      const keyPair = generateSigningKeyPair();
      const publicKey = keyPair.publicKey;
      const privateKey = keyPair.privateKey;

      SecureStorage.setPublicKey(publicKey);
      SecureStorage.setPrivateKey(privateKey);

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

      SecureStorage.setPrivateKey(privateKey);
      const publicKey = SecureStorage.getPublicKey();

      return { publicKey: publicKey || "", privateKey };
    } catch (error) {
      throw new Error("Invalid private key");
    }
  };

  const encrypt = (message: string, recipientPublicKey: string): string => {
    const privateKey = SecureStorage.getPrivateKey();
    if (!privateKey) {
      throw new Error("Private key not found");
    }
    return encryptMessage(message, recipientPublicKey, privateKey);
  };

  const decrypt = (
    encryptedMessage: string,
    senderPublicKey: string
  ): string => {
    const privateKey = SecureStorage.getPrivateKey();
    if (!privateKey) {
      throw new Error("Private key not found");
    }
    return decryptMessage(encryptedMessage, senderPublicKey, privateKey);
  };

  const sign = (message: string): string => {
    const privateKey = SecureStorage.getPrivateKey();
    if (!privateKey) {
      throw new Error("Private key not found");
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
  };
};
