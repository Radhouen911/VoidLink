import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/common/Button";

export const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-void-black text-void-text">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-void-accent to-void-purple bg-clip-text text-transparent">
            VoidLink
          </h1>
          <p className="text-2xl text-void-text-dim mb-8">
            Zero-trust messaging where even we can't read your conversations
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/register")}>
              Get Started
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate("/login")}
            >
              Login
            </Button>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="card p-6 text-center">
            <div className="text-4xl mb-4">🔐</div>
            <h3 className="text-xl font-bold mb-2">End-to-End Encryption</h3>
            <p className="text-void-text-dim">
              Messages encrypted with Ed25519 and NaCl box. Only you and your
              recipient can read them.
            </p>
          </div>
          <div className="card p-6 text-center">
            <div className="text-4xl mb-4">🔑</div>
            <h3 className="text-xl font-bold mb-2">No Password Hassles</h3>
            <p className="text-void-text-dim">
              Cryptographic authentication means no password resets or recovery
              emails.
            </p>
          </div>
          <div className="card p-6 text-center">
            <div className="text-4xl mb-4">💾</div>
            <h3 className="text-xl font-bold mb-2">Your Keys, Your Control</h3>
            <p className="text-void-text-dim">
              Keys generated locally on your device. We never see your private
              key.
            </p>
          </div>
        </div>
      </div>

      {/* Security Guarantees */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto card p-8">
          <h2 className="text-3xl font-bold mb-6 text-center">
            What We CAN'T Do
          </h2>
          <ul className="space-y-3 text-void-text-dim">
            <li className="flex items-start gap-2">
              <span className="text-void-danger">✗</span>
              <span>Read your messages</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-void-danger">✗</span>
              <span>Access your private keys</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-void-danger">✗</span>
              <span>Decrypt your data</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-void-danger">✗</span>
              <span>Reset your password (because there isn't one)</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-void-text-dim border-t border-void-purple">
        <p>Built with cryptographic paranoia</p>
      </footer>
    </div>
  );
};
