/**
 * Centralized Message Decryption Service
 * Single source of truth for all message decryption operations
 */

import { decryptMessage } from "../crypto/encryption";
import { getSessionPrivateKey } from "./auth";

export interface DecryptionResult {
  success: boolean;
  content: string;
  error?: string;
}

/**
 * Decrypt a message for display in the UI
 * Handles all error cases consistently
 *
 * @param encryptedPayload - The encrypted message payload (JSON string)
 * @param senderPublicKey - Public key of the message sender
 * @param recipientPublicKey - Public key of the message recipient
 * @param currentUserPublicKey - Public key of the current logged-in user
 * @returns DecryptionResult with success status and content
 */
export function decryptMessageForDisplay(
  encryptedPayload: string,
  senderPublicKey: string,
  recipientPublicKey: string,
  currentUserPublicKey: string
): DecryptionResult {
  // Get private key from session
  const privateKey = getSessionPrivateKey();

  if (!privateKey) {
    return {
      success: false,
      content: "[Session expired - login to decrypt]",
      error: "NO_PRIVATE_KEY",
    };
  }

  // Determine which public key to use for decryption
  // If we're the sender, use recipient's public key
  // If we're the recipient, use sender's public key
  const isSender = senderPublicKey === currentUserPublicKey;
  const otherPartyPublicKey = isSender ? recipientPublicKey : senderPublicKey;

  if (!otherPartyPublicKey) {
    return {
      success: false,
      content: "[Contact key unavailable]",
      error: "MISSING_PUBLIC_KEY",
    };
  }

  // Attempt decryption
  try {
    const decrypted = decryptMessage(
      encryptedPayload,
      otherPartyPublicKey,
      privateKey
    );

    if (!decrypted) {
      return {
        success: false,
        content: "[Decryption failed]",
        error: "DECRYPTION_FAILED",
      };
    }

    return {
      success: true,
      content: decrypted,
    };
  } catch (error) {
    console.error("Message decryption error:", error);
    return {
      success: false,
      content: "[Decryption error]",
      error: "DECRYPTION_EXCEPTION",
    };
  }
}

/**
 * Batch decrypt multiple messages
 * More efficient than decrypting one at a time
 *
 * @param messages - Array of messages to decrypt
 * @param currentUserPublicKey - Public key of current user
 * @returns Array of messages with decrypted content
 */
export function batchDecryptMessages<
  T extends {
    encryptedPayload: string;
    senderId: string;
    recipientId: string;
    decryptedContent?: string;
  }
>(messages: T[], currentUserPublicKey: string): T[] {
  return messages.map((msg) => {
    // Skip if already decrypted
    if (msg.decryptedContent && msg.decryptedContent !== "[Encrypted]") {
      return msg;
    }

    const result = decryptMessageForDisplay(
      msg.encryptedPayload,
      msg.senderId,
      msg.recipientId,
      currentUserPublicKey
    );

    return {
      ...msg,
      decryptedContent: result.content,
    };
  });
}
