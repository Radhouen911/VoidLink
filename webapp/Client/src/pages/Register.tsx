import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { Loading } from "../components/common/Loading";
import { useToast } from "../components/common/Toast";
import { authService } from "../services/auth";

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();

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
      await authService.register(username, password, passphrase);
      showToast("Account created successfully!", "success");
      showToast("Keys generated and encrypted!", "success");
      setTimeout(() => navigate("/chat"), 1500);
    } catch (error: any) {
      console.error("Registration error:", error);

      let errorMessage = "Registration failed. Please try again.";

      // Check for specific error codes/messages
      if (
        error.message?.includes("Username already exists") ||
        error.message?.includes("USERNAME_EXISTS")
      ) {
        errorMessage = "Username already taken. Please choose another.";
      } else if (error.message?.includes("Username must be")) {
        errorMessage = "Username must be between 3 and 50 characters.";
      } else if (error.message?.includes("Password must be")) {
        errorMessage = "Password must be at least 8 characters.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      showToast(errorMessage, "error");
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-void-black flex items-center justify-center px-4">
        <div className="card max-w-md w-full p-8 text-center">
          <Loading size="lg" text="Creating your account..." />
          <div className="mt-6 space-y-2 text-sm text-void-text-dim">
            <p>⏳ Generating encryption keys...</p>
            <p>🔐 Encrypting your private key...</p>
            <p>☁️ Setting up cloud backup...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 animate-fade-in relative">
      <div className="card max-w-md w-full p-8 animate-fade-in">
        <h1
          className="text-3xl font-bold text-center mb-2 text-gradient"
          data-testid="register-title"
        >
          Create Your Account
        </h1>
        <p className="text-center text-void-text-dim mb-6">
          Zero-trust secure messaging
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Username"
            name="username"
            data-testid="username-input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={errors.username}
            placeholder="Enter username"
            disabled={isLoading}
          />

          <Input
            label="Password"
            name="password"
            data-testid="password-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            placeholder="Enter password"
            disabled={isLoading}
          />

          <Input
            label="Confirm Password"
            name="confirmPassword"
            data-testid="confirm-password-input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
            placeholder="Confirm password"
            disabled={isLoading}
          />

          <div className="border-t border-void-purple/30 pt-4 mt-4">
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
              name="passphrase"
              data-testid="passphrase-input"
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              error={errors.passphrase}
              placeholder="Enter encryption passphrase"
              disabled={isLoading}
            />

            <Input
              label="Confirm Passphrase"
              name="confirmPassphrase"
              data-testid="confirm-passphrase-input"
              type="password"
              value={confirmPassphrase}
              onChange={(e) => setConfirmPassphrase(e.target.value)}
              error={errors.confirmPassphrase}
              placeholder="Confirm passphrase"
              disabled={isLoading}
            />

            <div className="glass-light border border-void-warning/30 rounded-xl p-3 text-xs text-void-text-dim mt-3">
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
            className="text-void-accent hover:underline transition-all"
            disabled={isLoading}
          >
            Login
          </button>
        </p>
      </div>
      <ToastContainer />
    </div>
  );
};
