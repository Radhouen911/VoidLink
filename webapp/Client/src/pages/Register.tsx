import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { Loading } from "../components/common/Loading";
import { useToast } from "../components/common/Toast";
import { authService } from "../services/auth";

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!username || username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    if (!password || password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!passphrase || passphrase.length < 8) {
      newErrors.passphrase = "Passphrase must be at least 8 characters";
    }

    if (passphrase !== confirmPassphrase) {
      newErrors.confirmPassphrase = "Passphrases do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsLoading(true);
    try {
      showToast("Creating account and generating keys...", "info");
      await authService.register(username, password, passphrase);
      showToast("Account created successfully! Redirecting...", "success");
      setTimeout(() => navigate("/chat"), 1500);
    } catch (error: any) {
      console.error("Registration error:", error);
      showToast(
        error.message || "Registration failed. Please try again.",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-void-black flex items-center justify-center px-4">
        <div className="card max-w-md w-full p-8 text-center">
          <Loading size="lg" text="Creating your secure account..." />
          <p className="text-void-text-dim mt-4 text-sm">
            Generating and encrypting your keys...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void-black flex items-center justify-center px-4 animate-fade-in">
      <div className="card max-w-md w-full p-8">
        <h1 className="text-3xl font-bold text-center mb-2 text-void-text">
          Create Your Account
        </h1>
        <p className="text-center text-void-text-dim mb-6">
          Zero-trust secure messaging
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={errors.username}
            placeholder="Enter username"
            disabled={isLoading}
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            placeholder="Enter password"
            disabled={isLoading}
          />

          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
            placeholder="Confirm password"
            disabled={isLoading}
          />

          <div className="border-t border-void-purple pt-4 mt-4">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-void-text mb-2">
                🔐 Encryption Passphrase
              </h3>
              <p className="text-xs text-void-text-dim mb-3">
                Your passphrase encrypts your private key. You'll need it every
                time you login.
              </p>
            </div>

            <Input
              label="Passphrase"
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              error={errors.passphrase}
              placeholder="Enter encryption passphrase"
              disabled={isLoading}
            />

            <Input
              label="Confirm Passphrase"
              type="password"
              value={confirmPassphrase}
              onChange={(e) => setConfirmPassphrase(e.target.value)}
              error={errors.confirmPassphrase}
              placeholder="Confirm passphrase"
              disabled={isLoading}
            />

            <div className="bg-void-warning/10 border border-void-warning/30 rounded p-3 text-xs text-void-text-dim mt-3">
              <span className="text-void-warning">⚠️ Critical:</span> Your
              passphrase encrypts your private key both locally and on the
              server. If you lose it, you cannot recover your account.
            </div>
          </div>

          <div className="flex items-start gap-2 text-sm text-void-text-dim">
            <input type="checkbox" required className="mt-1" />
            <span>
              I understand that my passphrase cannot be recovered and I'm
              responsible for remembering it
            </span>
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Create Account & Generate Keys
          </Button>
        </form>

        <p className="text-center text-void-text-dim mt-6">
          Already have an account?{" "}
          <button
            onClick={() => navigate("/login")}
            className="text-void-accent hover:underline"
            disabled={isLoading}
          >
            Login
          </button>
        </p>
      </div>
    </div>
  );
};
