/**
 * Mock Message Decryption Service for Demo Mode
 * Returns readable mock content instead of actual decryption
 */

export interface DecryptionResult {
  success: boolean;
  content: string;
  error?: string;
}

// Mock message content based on encrypted payload patterns
const mockMessages = [
  "Hello! Welcome to VoidLink demo 👋",
  "This is a secure encrypted message",
  "How are you doing today?",
  "The encryption is working perfectly!",
  "Thanks for trying out VoidLink",
  "This message was 'decrypted' in demo mode",
  "End-to-end encryption demo",
  "Secure messaging at its finest",
  "Your privacy is protected",
  "Demo message content",
];

/**
 * Mock decrypt a message for display in demo mode
 * Always succeeds and returns readable content
 */
export const decryptMessageForDisplay = (
  encryptedPayload: string,
  senderPublicKey: string,
  recipientPublicKey: string,
  currentUserPublicKey: string,
): DecryptionResult => {
  // In demo mode, always succeed with mock content

  // Generate consistent mock content based on payload hash
  const hash = encryptedPayload.length + senderPublicKey.length;
  const messageIndex = hash % mockMessages.length;
  const mockContent = mockMessages[messageIndex];

  return {
    success: true,
    content: mockContent,
  };
};

/**
 * Mock batch decrypt multiple messages
 */
export const batchDecryptMessages = <
  T extends {
    encryptedPayload: string;
    senderId: string;
    recipientId: string;
    decryptedContent?: string;
  },
>(
  messages: T[],
  currentUserPublicKey: string,
): T[] => {
  return messages.map((msg, index) => {
    // Skip if already decrypted
    if (msg.decryptedContent && msg.decryptedContent !== "[Encrypted]") {
      return msg;
    }

    // Use index to get different mock messages
    const mockContent = mockMessages[index % mockMessages.length];

    return {
      ...msg,
      decryptedContent: mockContent,
    };
  });
};
