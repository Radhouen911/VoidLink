import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { Loading } from "../components/common/Loading";
import { useToast } from "../components/common/Toast";
import { authService } from "../services/auth";

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password || !passphrase) {
      showToast("Please fill in all fields", "error");
      return;
    }

    setIsLoading(true);
    try {
      showToast("Authenticating and decrypting keys...", "info");
      await authService.login(username, password, passphrase);
      showToast("Login successful! Redirecting...", "success");
      setTimeout(() => navigate("/chat"), 1500);
    } catch (error: any) {
      console.error("Login error:", error);

      if (error.message.includes("Incorrect passphrase")) {
        showToast("Incorrect passphrase. Please try again.", "error");
      } else if (error.message.includes("No backup found")) {
        showToast("No backup found. You may need to register first.", "error");
      } else {
        showToast(
          error.message || "Login failed. Please check your credentials.",
          "error"
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-void-black flex items-center justify-center px-4">
        <div className="card max-w-md w-full p-8 text-center">
          <Loading size="lg" text="Authenticating..." />
          <p className="text-void-text-dim mt-4 text-sm">
            Decrypting your keys securely...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void-black flex items-center justify-center px-4 animate-fade-in">
      <div className="card max-w-md w-full p-8">
        <h1 className="text-3xl font-bold text-center mb-2 text-void-text">
          Welcome Back
        </h1>
        <p className="text-center text-void-text-dim mb-6">
          Login from any device
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            disabled={isLoading}
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            disabled={isLoading}
          />

          <div className="border-t border-void-purple pt-4">
            <Input
              label="Encryption Passphrase"
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter your encryption passphrase"
              disabled={isLoading}
            />
            <p className="text-xs text-void-text-dim mt-2">
              Your passphrase is needed to decrypt your private key
            </p>
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Decrypt & Login
          </Button>
        </form>

        <div className="mt-6 p-4 bg-void-purple/20 rounded-lg border border-void-purple">
          <p className="text-sm text-void-text-dim text-center">
            <span className="text-void-accent">🔐</span> Your keys are encrypted
            with your passphrase. Login works from any device.
          </p>
        </div>

        <p className="text-center text-void-text-dim mt-6">
          Don't have an account?{" "}
          <button
            onClick={() => navigate("/register")}
            className="text-void-accent hover:underline"
            disabled={isLoading}
          >
            Register
          </button>
        </p>
      </div>
    </div>
  );
};
