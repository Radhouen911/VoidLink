import React from "react";
import { useNavigate } from "react-router-dom";

export const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 auth-gradient-bg overflow-y-auto">
      {/* Navbar */}
      <nav className="bg-black/20 backdrop-blur-md border-b border-white/10 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">VoidLink</h1>
          <div className="flex gap-4">
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 text-white/80 hover:text-white transition-colors"
            >
              Login
            </button>
            <button
              onClick={() => navigate("/register")}
              className="px-6 py-2 btn-gradient rounded-lg text-white font-medium"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-6 py-20 animate-fade-scale-in">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-6xl md:text-7xl font-bold mb-6 text-white">
            Secure Messaging,
            <br />
            <span className="text-purple-300">Zero Trust</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/70 mb-12 max-w-2xl mx-auto leading-relaxed">
            End-to-end encrypted messaging where even we can't read your
            conversations. Your privacy is guaranteed by mathematics, not
            promises.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <button
              onClick={() => navigate("/register")}
              className="px-8 py-4 btn-gradient rounded-xl text-lg font-semibold"
            >
              Create Account
            </button>
            <button
              onClick={() => navigate("/login")}
              className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl text-lg font-semibold transition-all border border-white/20"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="glass-auth-strong rounded-2xl p-8 text-center hover:scale-105 transition-all duration-300">
            <div className="text-5xl mb-4">🔐</div>
            <h3 className="text-xl font-bold mb-3 text-white">
              End-to-End Encryption
            </h3>
            <p className="text-white/70 leading-relaxed">
              Messages encrypted with Ed25519 and NaCl. Only you and your
              recipient can read them.
            </p>
          </div>
          <div className="glass-auth-strong rounded-2xl p-8 text-center hover:scale-105 transition-all duration-300">
            <div className="text-5xl mb-4">☁️</div>
            <h3 className="text-xl font-bold mb-3 text-white">Cloud Backup</h3>
            <p className="text-white/70 leading-relaxed">
              Your encrypted keys are backed up securely. Login from any device
              with your passphrase.
            </p>
          </div>
          <div className="glass-auth-strong rounded-2xl p-8 text-center hover:scale-105 transition-all duration-300">
            <div className="text-5xl mb-4">🛡️</div>
            <h3 className="text-xl font-bold mb-3 text-white">
              Zero-Knowledge
            </h3>
            <p className="text-white/70 leading-relaxed">
              We never have access to your unencrypted messages or private keys.
              Ever.
            </p>
          </div>
        </div>
      </div>

      {/* Security Guarantees */}
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-3xl mx-auto glass-auth-strong rounded-3xl p-10">
          <h2 className="text-3xl font-bold mb-8 text-center text-white">
            What We <span className="text-red-400">CAN'T</span> Do
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/10">
              <div className="w-6 h-6 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              </div>
              <span className="text-white/80">Read your messages</span>
            </div>
            <div className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/10">
              <div className="w-6 h-6 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              </div>
              <span className="text-white/80">Access your private keys</span>
            </div>
            <div className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/10">
              <div className="w-6 h-6 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              </div>
              <span className="text-white/80">Decrypt your data</span>
            </div>
            <div className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/10">
              <div className="w-6 h-6 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              </div>
              <span className="text-white/80">Recover lost passphrases</span>
            </div>
          </div>
          <p className="text-center text-white/60 mt-8 text-sm">
            Your security is guaranteed by cryptography, not trust.
          </p>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4 text-white">
            Ready to secure your conversations?
          </h2>
          <p className="text-white/70 mb-8 text-lg">
            Join VoidLink and experience truly private messaging.
          </p>
          <button
            onClick={() => navigate("/register")}
            className="px-8 py-4 btn-gradient rounded-xl text-lg font-semibold"
          >
            Create Your Account
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 text-center text-white/50 border-t border-white/10 mt-16">
        <div className="flex justify-center gap-6 mb-4">
          <button
            onClick={() => navigate("/privacy-policy")}
            className="hover:text-white/80 transition-colors"
          >
            Privacy Policy
          </button>
          <span>•</span>
          <button className="hover:text-white/80 transition-colors">
            About
          </button>
          <span>•</span>
          <button className="hover:text-white/80 transition-colors">
            Contact
          </button>
        </div>
        <p className="text-sm">Built with cryptographic paranoia 🔒</p>
      </footer>
    </div>
  );
};
