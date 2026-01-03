import nacl from "tweetnacl";
import {
  decodeBase64,
  decodeUTF8,
  encodeBase64,
  encodeUTF8,
} from "tweetnacl-util";

/**
 * Encrypt a message for a recipient using NaCl box (Curve25519 + XSalsa20 + Poly1305)
 */
export function encryptMessage(
  message: string,
  recipientPublicKey: string,
  senderPrivateKey: string
): string {
  const nonce = nacl.randomBytes(24);
  const messageBytes = encodeUTF8(message);
  const recipientPublicKeyBytes = decodeBase64(recipientPublicKey);
  const senderPrivateKeyBytes = decodeBase64(senderPrivateKey);

  const encrypted = nacl.box(
    messageBytes,
    nonce,
    recipientPublicKeyBytes,
    senderPrivateKeyBytes
  );

  const payload = {
    nonce: encodeBase64(nonce),
    encrypted: encodeBase64(encrypted),
  };

  return JSON.stringify(payload);
}

/**
 * Decrypt a message from a sender using NaCl box
 */
export function decryptMessage(
  encryptedPayload: string,
  senderPublicKey: string,
  recipientPrivateKey: string
): string | null {
  try {
    const payload = JSON.parse(encryptedPayload);
    const nonce = decodeBase64(payload.nonce);
    const encrypted = decodeBase64(payload.encrypted);
    const senderPublicKeyBytes = decodeBase64(senderPublicKey);
    const recipientPrivateKeyBytes = decodeBase64(recipientPrivateKey);

    const decrypted = nacl.box.open(
      encrypted,
      nonce,
      senderPublicKeyBytes,
      recipientPrivateKeyBytes
    );

    if (!decrypted) {
      return null;
    }

    return decodeUTF8(decrypted);
  } catch (error) {
    console.error("Decryption failed:", error);
    return null;
  }
}

/**
 * Encrypt data with a symmetric key (for local storage)
 */
export function encryptSymmetric(data: string, key: Uint8Array): string {
  const nonce = nacl.randomBytes(24);
  const dataBytes = encodeUTF8(data);

  const encrypted = nacl.secretbox(dataBytes, nonce, key);

  const payload = {
    nonce: encodeBase64(nonce),
    encrypted: encodeBase64(encrypted),
  };

  return JSON.stringify(payload);
}

/**
 * Decrypt data with a symmetric key (for local storage)
 */
export function decryptSymmetric(
  encryptedPayload: string,
  key: Uint8Array
): string | null {
  try {
    const payload = JSON.parse(encryptedPayload);
    const nonce = decodeBase64(payload.nonce);
    const encrypted = decodeBase64(payload.encrypted);

    const decrypted = nacl.secretbox.open(encrypted, nonce, key);

    if (!decrypted) {
      return null;
    }

    return decodeUTF8(decrypted);
  } catch (error) {
    console.error("Symmetric decryption failed:", error);
    return null;
  }
}

/**
 * Generate a random symmetric key
 */
export function generateSymmetricKey(): Uint8Array {
  return nacl.randomBytes(32);
}
