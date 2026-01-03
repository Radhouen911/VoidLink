import nacl from "tweetnacl";
import { encodeUTF8 } from "tweetnacl-util";

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
 * Sign a message with Ed25519 private key (HEX FORMAT)
 */
export function signMessage(message: string, privateKey: string): string {
  const messageBytes = encodeUTF8(message);
  const privateKeyBytes = fromHex(privateKey);

  const signature = nacl.sign.detached(messageBytes, privateKeyBytes);
  return toHex(signature);
}

/**
 * Verify a signature with Ed25519 public key (HEX FORMAT)
 */
export function verifySignature(
  message: string,
  signature: string,
  publicKey: string
): boolean {
  try {
    const messageBytes = encodeUTF8(message);
    const signatureBytes = fromHex(signature);
    const publicKeyBytes = fromHex(publicKey);

    return nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );
  } catch (error) {
    console.error("Signature verification failed:", error);
    return false;
  }
}

/**
 * Sign a challenge for authentication
 */
export function signChallenge(challenge: string, privateKey: string): string {
  // Challenge is already in hex format from server
  const challengeBytes = fromHex(challenge);
  const privateKeyBytes = fromHex(privateKey);

  const signature = nacl.sign.detached(challengeBytes, privateKeyBytes);
  return toHex(signature);
}
