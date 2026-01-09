import React from "react";
import { useNavigate } from "react-router-dom";

export const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 auth-gradient-bg overflow-y-auto">
      {/* Navbar */}
      <nav className="bg-black/20 backdrop-blur-md border-b border-white/10 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <img src="/logo.png" alt="VoidLink" className="h-6 w-auto" />
            <span className="text-2xl font-bold text-white">VoidLink</span>
          </button>
          <div className="flex gap-4">
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 text-white/80 hover:text-white transition-colors"
            >
              Login
            </button>
            <button
              onClick={() => navigate("/register")}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all border border-white/20"
            >
              Register
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="glass-auth-strong rounded-3xl p-8 animate-fade-scale-in">
          <h1 className="text-3xl font-bold text-white mb-6">
            Privacy Policy & Security
          </h1>

          <div className="space-y-6 text-white/80">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                🔐 End-to-End Encryption
              </h2>
              <p className="leading-relaxed">
                VoidLink uses end-to-end encryption to ensure that only you and
                your intended recipients can read your messages. Your messages
                are encrypted on your device before being sent and can only be
                decrypted by the recipient's device.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                🔑 Encryption Passphrase
              </h2>
              <p className="leading-relaxed mb-3">
                Your encryption passphrase is the key to your private encryption
                key. It is used to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Encrypt your private key before storing it</li>
                <li>Decrypt your private key when you log in</li>
                <li>Ensure that only you can access your encrypted messages</li>
              </ul>
              <p className="leading-relaxed mt-3 text-yellow-200">
                <strong>Important:</strong> Your passphrase is never sent to our
                servers in plain text. If you lose your passphrase, we cannot
                recover it for you, and you will lose access to your encrypted
                messages.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                ☁️ Cloud Backup
              </h2>
              <p className="leading-relaxed">
                Your encrypted private key is backed up to our servers. This
                allows you to log in from any device using your username,
                password, and encryption passphrase. The backup is encrypted
                with your passphrase, so we cannot access your private key even
                if we wanted to.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                🛡️ Zero-Knowledge Architecture
              </h2>
              <p className="leading-relaxed">
                We follow a zero-knowledge architecture, which means:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
                <li>We never have access to your unencrypted messages</li>
                <li>We never have access to your unencrypted private key</li>
                <li>We cannot read your messages or impersonate you</li>
                <li>
                  Your encryption passphrase never leaves your device in plain
                  text
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                📊 Data We Collect
              </h2>
              <p className="leading-relaxed mb-3">
                We collect minimal data necessary to provide the service:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Username and hashed password (for authentication)</li>
                <li>
                  Encrypted private key backup (encrypted with your passphrase)
                </li>
                <li>Encrypted messages (we cannot decrypt them)</li>
                <li>
                  Connection metadata (IP address, timestamps) for security
                  purposes
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                🔒 Your Responsibilities
              </h2>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Keep your encryption passphrase secure and memorable</li>
                <li>Use a strong, unique passphrase (at least 8 characters)</li>
                <li>Never share your passphrase with anyone</li>
                <li>
                  Understand that losing your passphrase means losing access to
                  your messages
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                📧 Contact
              </h2>
              <p className="leading-relaxed">
                If you have questions about our privacy policy or security
                practices, please contact us through our support channels.
              </p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10">
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all border border-white/20"
            >
              ← Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
