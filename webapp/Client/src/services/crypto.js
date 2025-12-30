import sodium from 'libsodium-wrappers';

class CryptoService {
  constructor() {
    this.isReady = false;
    this.keyPair = null;
    this.sessionKeys = new Map(); // For forward secrecy
  }

  async initialize() {
    await sodium.ready;
    this.isReady = true;
  }

  // Generate a new key pair for the user
  generateKeyPair() {
    if (!this.isReady) throw new Error('Crypto service not initialized');
    
    this.keyPair = sodium.crypto_box_keypair();
    return {
      publicKey: sodium.to_hex(this.keyPair.publicKey),
      privateKey: sodium.to_hex(this.keyPair.privateKey)
    };
  }

  // Load existing key pair from storage
  loadKeyPair(publicKeyHex, privateKeyHex) {
    if (!this.isReady) throw new Error('Crypto service not initialized');
    
    this.keyPair = {
      publicKey: sodium.from_hex(publicKeyHex),
      privateKey: sodium.from_hex(privateKeyHex)
    };
  }

  // Generate ephemeral session key for forward secrecy
  generateSessionKey(recipientPublicKeyHex) {
    if (!this.isReady) throw new Error('Crypto service not initialized');
    
    const ephemeralKeyPair = sodium.crypto_box_keypair();
    const recipientPublicKey = sodium.from_hex(recipientPublicKeyHex);
    
    // Derive shared secret using ephemeral key
    const sharedSecret = sodium.crypto_box_beforenm(
      recipientPublicKey,
      ephemeralKeyPair.privateKey
    );

    const sessionId = sodium.to_hex(ephemeralKeyPair.publicKey);
    this.sessionKeys.set(sessionId, {
      sharedSecret,
      ephemeralPublicKey: ephemeralKeyPair.publicKey,
      timestamp: Date.now()
    });

    return {
      sessionId,
      ephemeralPublicKey: sodium.to_hex(ephemeralKeyPair.publicKey)
    };
  }

  // Encrypt message with forward secrecy
  encryptMessage(message, recipientPublicKeyHex, sessionId = null) {
    if (!this.isReady) throw new Error('Crypto service not initialized');
    
    let sharedSecret;
    let ephemeralPublicKey = null;

    if (sessionId && this.sessionKeys.has(sessionId)) {
      // Use existing session key
      const session = this.sessionKeys.get(sessionId);
      sharedSecret = session.sharedSecret;
      ephemeralPublicKey = session.ephemeralPublicKey;
    } else {
      // Create new session
      const session = this.generateSessionKey(recipientPublicKeyHex);
      sessionId = session.sessionId;
      sharedSecret = this.sessionKeys.get(sessionId).sharedSecret;
      ephemeralPublicKey = this.sessionKeys.get(sessionId).ephemeralPublicKey;
    }

    const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
    const messageBytes = sodium.from_string(message);
    
    const ciphertext = sodium.crypto_box_easy_afternm(
      messageBytes,
      nonce,
      sharedSecret
    );

    return {
      ciphertext: sodium.to_hex(ciphertext),
      nonce: sodium.to_hex(nonce),
      sessionId,
      ephemeralPublicKey: sodium.to_hex(ephemeralPublicKey),
      timestamp: Date.now()
    };
  }

  // Decrypt message
  decryptMessage(encryptedData, senderPublicKeyHex) {
    if (!this.isReady) throw new Error('Crypto service not initialized');
    
    const { ciphertext, nonce, ephemeralPublicKey } = encryptedData;
    
    // Derive shared secret using sender's ephemeral key
    const ephemeralPubKey = sodium.from_hex(ephemeralPublicKey);
    const sharedSecret = sodium.crypto_box_beforenm(
      ephemeralPubKey,
      this.keyPair.privateKey
    );

    try {
      const decrypted = sodium.crypto_box_open_easy_afternm(
        sodium.from_hex(ciphertext),
        sodium.from_hex(nonce),
        sharedSecret
      );

      return sodium.to_string(decrypted);
    } catch (error) {
      throw new Error('Failed to decrypt message - invalid key or corrupted data');
    }
  }

  // Generate QR code data for key exchange
  generateQRData() {
    if (!this.keyPair) throw new Error('No key pair available');
    
    return {
      type: 'voidlink_key',
      publicKey: sodium.to_hex(this.keyPair.publicKey),
      version: '1.0'
    };
  }

  // Verify message integrity
  signMessage(message) {
    if (!this.isReady) throw new Error('Crypto service not initialized');
    
    const messageBytes = sodium.from_string(message);
    const signature = sodium.crypto_sign_detached(messageBytes, this.keyPair.privateKey);
    
    return sodium.to_hex(signature);
  }

  verifySignature(message, signatureHex, publicKeyHex) {
    if (!this.isReady) throw new Error('Crypto service not initialized');
    
    const messageBytes = sodium.from_string(message);
    const signature = sodium.from_hex(signatureHex);
    const publicKey = sodium.from_hex(publicKeyHex);
    
    return sodium.crypto_sign_verify_detached(signature, messageBytes, publicKey);
  }

  // Clean up old session keys for forward secrecy
  cleanupOldSessions(maxAge = 3600000) { // 1 hour default
    const now = Date.now();
    for (const [sessionId, session] of this.sessionKeys.entries()) {
      if (now - session.timestamp > maxAge) {
        this.sessionKeys.delete(sessionId);
      }
    }
  }

  // Get public key for sharing
  getPublicKey() {
    if (!this.keyPair) return null;
    return sodium.to_hex(this.keyPair.publicKey);
  }

  // Export key pair for backup
  exportKeyPair() {
    if (!this.keyPair) return null;
    return {
      publicKey: sodium.to_hex(this.keyPair.publicKey),
      privateKey: sodium.to_hex(this.keyPair.privateKey)
    };
  }
}

export default new CryptoService();