import nacl from "tweetnacl";
import {
  decodeBase64,
  decodeUTF8,
  encodeBase64,
  encodeUTF8,
} from "tweetnacl-util";

export interface KeyPair {
  publicKey: string;
  privateKey: string;
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
 * Convert hex string to Uint8Array
 */
function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Generate a new Ed25519 key pair for signing (HEX FORMAT for backend compatibility)
 */
export function generateSigningKeyPair(): KeyPair {
  const keyPair = nacl.sign.keyPair();
  return {
    publicKey: toHex(keyPair.publicKey),
    privateKey: toHex(keyPair.secretKey),
  };
}

/**
 * Generate a new Curve25519 key pair for encryption
 */
export function generateEncryptionKeyPair(): KeyPair {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: toHex(keyPair.publicKey),
    privateKey: toHex(keyPair.secretKey),
  };
}

/**
 * Convert Ed25519 signing key to Curve25519 encryption key
 */
export function convertSigningKeyToEncryptionKey(signingKey: string): string {
  const signingKeyBytes = fromHex(signingKey);
  const encryptionKeyBytes =
    nacl.sign.keyPair.fromSecretKey(signingKeyBytes).publicKey;
  return toHex(encryptionKeyBytes);
}

/**
 * Export keys as encrypted backup
 */
export function exportKeysAsBackup(
  privateKey: string,
  password: string
): string {
  // In production, use proper key derivation (PBKDF2) and encryption
  // For now, we'll use a simple approach
  const nonce = nacl.randomBytes(24);
  const key = nacl.hash(encodeUTF8(password)).slice(0, 32);

  const encrypted = nacl.secretbox(encodeUTF8(privateKey), nonce, key);

  const backup = {
    version: 1,
    nonce: encodeBase64(nonce),
    encrypted: encodeBase64(encrypted),
    timestamp: Date.now(),
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Import keys from encrypted backup
 */
export function importKeysFromBackup(
  backupJson: string,
  password: string
): string | null {
  try {
    const backup = JSON.parse(backupJson);
    const nonce = decodeBase64(backup.nonce);
    const encrypted = decodeBase64(backup.encrypted);
    const key = nacl.hash(encodeUTF8(password)).slice(0, 32);

    const decrypted = nacl.secretbox.open(encrypted, nonce, key);
    if (!decrypted) {
      return null;
    }

    return decodeUTF8(decrypted);
  } catch (error) {
    console.error("Failed to import backup:", error);
    return null;
  }
}

/**
 * Generate a fingerprint for key verification
 */
export function generateKeyFingerprint(publicKey: string): string {
  const keyBytes = fromHex(publicKey);
  const hash = nacl.hash(keyBytes);
  const fingerprint = toHex(hash).slice(0, 32);

  // Format as groups of 4 characters
  return fingerprint.match(/.{1,4}/g)?.join(" ") || fingerprint;
}

/**
 * Validate key format (hex)
 */
export function isValidPublicKey(key: string): boolean {
  try {
    return /^[0-9a-f]{64}$/i.test(key); // Ed25519 public keys are 32 bytes = 64 hex chars
  } catch {
    return false;
  }
}

/**
 * Validate private key format (hex)
 */
export function isValidPrivateKey(key: string): boolean {
  try {
    return /^[0-9a-f]{128}$/i.test(key); // Ed25519 secret keys are 64 bytes = 128 hex chars
  } catch {
    return false;
  }
}
