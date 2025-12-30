// Test script to generate Ed25519 keys and signatures for testing
const nacl = require("tweetnacl");
const crypto = require("crypto");

// Generate a test keypair
const keyPair = nacl.sign.keyPair();
const publicKeyHex = Buffer.from(keyPair.publicKey).toString("hex");
const privateKeyHex = Buffer.from(keyPair.secretKey).toString("hex");

console.log("Generated Ed25519 Key Pair:");
console.log("Public Key (hex):", publicKeyHex);
console.log("Private Key (hex):", privateKeyHex);
console.log();

// Test challenge and signature
const challenge = crypto.randomBytes(32).toString("hex");
const messageBytes = Buffer.from(challenge, "utf8");
const signature = nacl.sign.detached(messageBytes, keyPair.secretKey);
const signatureHex = Buffer.from(signature).toString("hex");

console.log("Test Challenge:", challenge);
console.log("Signature (hex):", signatureHex);
console.log();

// Verify signature
const isValid = nacl.sign.detached.verify(
  messageBytes,
  signature,
  keyPair.publicKey
);
console.log("Signature verification:", isValid ? "VALID ✅" : "INVALID ❌");
console.log();

// Generate test data for Alice and Bob
console.log("=== Test Data for mockdata.json ===");

const aliceKeyPair = nacl.sign.keyPair();
const bobKeyPair = nacl.sign.keyPair();

console.log("Alice:");
console.log(
  "  publicKey:",
  Buffer.from(aliceKeyPair.publicKey).toString("hex")
);
console.log(
  "  privateKey:",
  Buffer.from(aliceKeyPair.secretKey).toString("hex")
);
console.log();

console.log("Bob:");
console.log("  publicKey:", Buffer.from(bobKeyPair.publicKey).toString("hex"));
console.log("  privateKey:", Buffer.from(bobKeyPair.secretKey).toString("hex"));
console.log();

// Test signature for Alice
const testChallenge = "test_challenge_12345";
const aliceSignature = nacl.sign.detached(
  Buffer.from(testChallenge, "utf8"),
  aliceKeyPair.secretKey
);
console.log('Alice test signature for "test_challenge_12345":');
console.log("  signature:", Buffer.from(aliceSignature).toString("hex"));

module.exports = { nacl, crypto };
