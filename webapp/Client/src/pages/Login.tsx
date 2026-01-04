import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { Loading } from "../components/common/Loading";
import { useToast } from "../components/common/Toast";
import { authService } from "../services/auth";

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password || !passphrase) {
      showToast("✗ Please fill in all fields", "error");
      return;
    }

    setIsLoading(true);
    try {
      showToast("Authenticating...", "info");
      await authService.login(username, password, passphrase);
      showToast("✓ Login successful!", "success");
      showToast("Redirecting to chat...", "info");
      setTimeout(() => navigate("/chat"), 2000);
    } catch (error: any) {
      console.error("Login error:", error);

      let errorMessage = "Login failed. Please check your credentials.";

      if (error.message.includes("Incorrect passphrase")) {
        errorMessage = "✗ Incorrect passphrase. Please try again.";
      } else if (error.message.includes("No backup found")) {
        errorMessage = "✗ No backup found. You may need to register first.";
      } else if (error.message.includes("Invalid username or password")) {
        errorMessage = "✗ Invalid username or password.";
      } else if (error.message) {
        errorMessage = "✗ " + error.message;
      }

      showToast(errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 relative">
        <div className="card max-w-md w-full p-8 text-center animate-fade-in">
          <Loading size="lg" text="Logging in..." />
          <div className="mt-6 space-y-2 text-sm text-void-text-dim">
            <p>🔑 Fetching your encrypted keys...</p>
            <p>🔓 Decrypting with your passphrase...</p>
            <p>✓ Authenticating...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 animate-fade-in relative">
      <div className="card max-w-md w-full p-8 animate-fade-in">
        <h1 className="text-3xl font-bold text-center mb-2 text-gradient">
          Welcome Back
        </h1>
        <p className="text-center text-void-text-dim mb-6">
          Login from any device
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Username"
            name="username"
            data-testid="username-input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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
            placeholder="Enter password"
            disabled={isLoading}
          />

          <div className="border-t border-void-purple/30 pt-4">
            <Input
              label="Encryption Passphrase"
              name="passphrase"
              data-testid="passphrase-input"
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

        <div className="mt-6 p-4 glass-light rounded-xl border border-void-purple/30">
          <p className="text-sm text-void-text-dim text-center">
            <span className="text-void-accent">🔐</span> Your keys are encrypted
            with your passphrase. Login works from any device.
          </p>
        </div>

        <p className="text-center text-void-text-dim mt-6">
          Don't have an account?{" "}
          <button
            onClick={() => navigate("/register")}
            className="text-void-accent hover:underline transition-all"
            disabled={isLoading}
          >
            Register
          </button>
        </p>
      </div>
      <ToastContainer />
    </div>
  );
};
