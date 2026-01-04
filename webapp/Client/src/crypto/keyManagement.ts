import nacl from "tweetnacl";

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
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
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
  try {
    // Convert password to bytes using native TextEncoder
    const passwordBytes = stringToBytes(password);

    // Generate nonce
    const nonce = nacl.randomBytes(24);

    // Derive key from password using hash
    const keyHash = nacl.hash(passwordBytes);
    const key = keyHash.slice(0, 32);

    // Encrypt private key
    const privateKeyBytes = stringToBytes(privateKey);
    const encrypted = nacl.secretbox(privateKeyBytes, nonce, key);

    const backup = {
      version: 1,
      nonce: toBase64(nonce),
      encrypted: toBase64(encrypted),
      timestamp: Date.now(),
    };

    return JSON.stringify(backup, null, 2);
  } catch (error) {
    console.error("exportKeysAsBackup error:", error);
    throw new Error("Failed to create backup: " + (error as Error).message);
  }
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
    const nonce = fromBase64(backup.nonce);
    const encrypted = fromBase64(backup.encrypted);

    // Derive key from password
    const passwordBytes = stringToBytes(password);
    const keyHash = nacl.hash(passwordBytes);
    const key = keyHash.slice(0, 32);

    const decrypted = nacl.secretbox.open(encrypted, nonce, key);
    if (!decrypted) {
      return null;
    }

    return bytesToString(decrypted);
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
