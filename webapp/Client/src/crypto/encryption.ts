import * as ed2curve from "ed2curve";
import nacl from "tweetnacl";

/**
 * Convert hex string to Uint8Array
 */
function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string
 */
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Convert string to Uint8Array using native TextEncoder
 */
function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Convert Uint8Array to string using native TextDecoder
 */
function bytesToString(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/**
 * Convert Uint8Array to base64
 */
function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Convert base64 to Uint8Array
 */
function fromBase64(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

/**
 * Encrypt a message using NaCl box
 * Converts Ed25519 keys to Curve25519 for encryption
 */
export function encryptMessage(
  message: string,
  recipientPublicKey: string,
  senderPrivateKey: string
): string {
  const nonce = nacl.randomBytes(24);
  const messageBytes = stringToBytes(message);

  // Convert hex keys to bytes
  const recipientEd25519PublicKey = fromHex(recipientPublicKey);
  const senderEd25519SecretKey = fromHex(senderPrivateKey);

  // Convert Ed25519 keys to Curve25519 keys for encryption
  // Ed25519 secret key is 64 bytes: [32-byte seed][32-byte public key]
  // Extract the seed (first 32 bytes) for conversion
  const senderSeed = senderEd25519SecretKey.slice(0, 32);

  // Convert sender's Ed25519 seed to Curve25519 secret key
  const senderCurve25519SecretKey = ed2curve.convertSecretKey(senderSeed);
  if (!senderCurve25519SecretKey) {
    throw new Error("Failed to convert sender's secret key to Curve25519");
  }

  // Convert recipient's Ed25519 public key to Curve25519 public key
  const recipientCurve25519PublicKey = ed2curve.convertPublicKey(
    recipientEd25519PublicKey
  );
  if (!recipientCurve25519PublicKey) {
    throw new Error("Failed to convert recipient's public key to Curve25519");
  }

  const encrypted = nacl.box(
    messageBytes,
    nonce,
    recipientCurve25519PublicKey,
    senderCurve25519SecretKey
  );

  if (!encrypted) {
    throw new Error("Encryption failed");
  }

  const payload = {
    nonce: toBase64(nonce),
    encrypted: toBase64(encrypted),
  };

  return JSON.stringify(payload);
}

/**
 * Decrypt a message using NaCl box
 * Converts Ed25519 keys to Curve25519 for decryption
 */
export function decryptMessage(
  encryptedPayload: string,
  senderPublicKey: string,
  recipientPrivateKey: string
): string | null {
  try {
    const payload = JSON.parse(encryptedPayload);
    const nonce = fromBase64(payload.nonce);
    const encrypted = fromBase64(payload.encrypted);

    // Convert hex keys to bytes
    const senderEd25519PublicKey = fromHex(senderPublicKey);
    const recipientEd25519SecretKey = fromHex(recipientPrivateKey);

    // Extract recipient's seed (first 32 bytes)
    const recipientSeed = recipientEd25519SecretKey.slice(0, 32);

    // Convert recipient's Ed25519 seed to Curve25519 secret key
    const recipientCurve25519SecretKey =
      ed2curve.convertSecretKey(recipientSeed);
    if (!recipientCurve25519SecretKey) {
      console.error("Failed to convert recipient's secret key to Curve25519");
      return null;
    }

    // Convert sender's Ed25519 public key to Curve25519 public key
    const senderCurve25519PublicKey = ed2curve.convertPublicKey(
      senderEd25519PublicKey
    );
    if (!senderCurve25519PublicKey) {
      console.error("Failed to convert sender's public key to Curve25519");
      return null;
    }

    const decrypted = nacl.box.open(
      encrypted,
      nonce,
      senderCurve25519PublicKey,
      recipientCurve25519SecretKey
    );

    if (!decrypted) {
      return null;
    }

    return bytesToString(decrypted);
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
  const dataBytes = stringToBytes(data);

  const encrypted = nacl.secretbox(dataBytes, nonce, key);

  const payload = {
    nonce: toBase64(nonce),
    encrypted: toBase64(encrypted),
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
    const nonce = fromBase64(payload.nonce);
    const encrypted = fromBase64(payload.encrypted);

    const decrypted = nacl.secretbox.open(encrypted, nonce, key);

    if (!decrypted) {
      return null;
    }

    return bytesToString(decrypted);
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
