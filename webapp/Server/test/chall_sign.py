import sys
import binascii
from nacl.signing import SigningKey

def sign_challenge(private_key_hex, challenge):
    private_key_bytes = binascii.unhexlify(private_key_hex)

    # Handle 64-byte expanded private key
    if len(private_key_bytes) == 64:
        private_key_bytes = private_key_bytes[:32]

    if len(private_key_bytes) != 32:
        raise ValueError(
            f"Invalid private key length: {len(private_key_bytes)} bytes. "
            "Expected 32 or 64 bytes for Ed25519."
        )

    signing_key = SigningKey(private_key_bytes)

    # Always treat challenge as UTF-8 string (to match Node.js server)
    challenge_bytes = challenge.encode("utf-8")

    signature = signing_key.sign(challenge_bytes).signature
    return signature.hex()


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage:")
        print("  python chall_sign.py <private_key_hex> <challenge>")
        sys.exit(1)

    private_key_hex = sys.argv[1]
    challenge = sys.argv[2]

    sig = sign_challenge(private_key_hex, challenge)
    print("Signature (hex):")
    print(sig)
