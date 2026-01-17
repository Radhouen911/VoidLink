import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loading } from "../components/common/Loading";
import { useToast } from "../components/common/Toast";
import { authService } from "../services";

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // No validation - always proceed with demo login
    setIsLoading(true);
    try {
      showToast("Logging into demo account...", "info");
      // Always log in as demo user regardless of input (even if fields are empty)
      await authService.login("demo", "demo123", "demo");
      showToast("Welcome to VoidLink Demo!", "success");
      showToast("Redirecting to chat...", "info");
      setTimeout(() => navigate("/chat"), 2000);
    } catch (error: any) {
      console.error("Login error:", error);
      showToast("Demo login failed. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 auth-gradient-bg flex items-center justify-center px-4">
        <div className="glass-auth-strong rounded-3xl max-w-md w-full p-8 text-center animate-fade-scale-in">
          <Loading size="lg" text="Logging in..." />
          <div className="mt-6 space-y-2 text-sm text-white/80">
            <p>🔑 Fetching your encrypted keys...</p>
            <p>🔓 Decrypting with your passphrase...</p>
            <p>✓ Authenticating...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 auth-gradient-bg flex items-center justify-center px-4 overflow-hidden">
      {/* Back to Home Button */}
      <button
        onClick={() => navigate("/")}
        className="fixed top-6 left-6 flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm hover:bg-white/15 text-white rounded-lg border border-white/20 transition-all duration-150 z-10"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        <span className="font-medium">Back to Home</span>
      </button>

      <div className="glass-auth-strong rounded-3xl max-w-md w-full p-8 animate-fade-scale-in">
        {/* Avatar */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center shadow-lg">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center mb-2 text-white">
          Welcome Back
        </h1>
        <p className="text-center text-white/70 mb-8 text-sm">
          Login from any device
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username */}
          <div>
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 text-white/60"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <input
                name="username"
                data-testid="username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Demo User (auto-filled)"
                disabled={isLoading}
                className="input-underline flex-1 text-white"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 text-white/60"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
              <input
                name="password"
                data-testid="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Demo Password (auto-filled)"
                disabled={isLoading}
                className="input-underline flex-1 text-white"
              />
            </div>
          </div>

          {/* Passphrase */}
          <div className="pt-4 border-t border-white/10">
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 text-white/60"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <input
                name="passphrase"
                data-testid="passphrase-input"
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Demo Passphrase (auto-filled)"
                disabled={isLoading}
                className="input-underline flex-1 text-white"
              />
            </div>
            <p className="text-xs text-white/50 mt-3 ml-8">
              Your passphrase decrypts your private key
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-gradient py-3 rounded-xl text-base font-semibold"
          >
            Decrypt & Login
          </button>
        </form>

        {/* Register Link */}
        <p className="text-center text-white/70 mt-6 text-sm">
          Don't have an account?{" "}
          <button
            onClick={() => navigate("/register")}
            className="text-white font-semibold hover:underline transition-all"
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
