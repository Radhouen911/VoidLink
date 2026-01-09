import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const [agreedToTerms, setAgreedToTerms] = useState(false);
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

    if (!agreedToTerms) {
      newErrors.terms = "You must agree to the terms";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      showToast("Please fix the errors", "error");
      return;
    }

    setIsLoading(true);
    try {
      await authService.register(username, password, passphrase);
      showToast("Account created successfully!", "success");
      showToast("Keys generated and encrypted!", "success");
      setTimeout(() => navigate("/chat"), 1500);
    } catch (error: any) {
      console.error("Registration error:", error);

      let errorMessage = "Registration failed. Please try again.";

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
      <div className="fixed inset-0 auth-gradient-bg flex items-center justify-center px-4">
        <div className="glass-auth-strong rounded-3xl max-w-md w-full p-8 text-center animate-fade-scale-in">
          <Loading size="lg" text="Creating your account..." />
          <div className="mt-6 space-y-2 text-sm text-white/80">
            <p>⏳ Generating encryption keys...</p>
            <p>🔐 Encrypting your private key...</p>
            <p>☁️ Setting up cloud backup...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 auth-gradient-bg flex items-center justify-center px-4 overflow-hidden">
      <div className="glass-auth-strong rounded-3xl max-w-4xl w-full p-8 animate-fade-scale-in">
        {/* Avatar */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center shadow-lg">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          </div>
        </div>

        <h1
          className="text-2xl font-bold text-center mb-1 text-white"
          data-testid="register-title"
        >
          Create Account
        </h1>
        <p className="text-center text-white/70 mb-6 text-sm">
          Zero-trust secure messaging
        </p>

        <form onSubmit={handleSubmit}>
          {/* Two Column Layout */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            {/* Left Column - Account Credentials */}
            <div className="space-y-4">
              <p className="text-xs text-white/60 font-semibold uppercase tracking-wide mb-2">
                Account Credentials
              </p>

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
                    placeholder="Username"
                    disabled={isLoading}
                    className="input-underline flex-1 text-white"
                  />
                </div>
                {errors.username && (
                  <p className="text-xs text-red-300 mt-1 ml-8">
                    {errors.username}
                  </p>
                )}
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
                    placeholder="Password"
                    disabled={isLoading}
                    className="input-underline flex-1 text-white"
                  />
                </div>
                {errors.password && (
                  <p className="text-xs text-red-300 mt-1 ml-8">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
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
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <input
                    name="confirmPassword"
                    data-testid="confirm-password-input"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm Password"
                    disabled={isLoading}
                    className="input-underline flex-1 text-white"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-red-300 mt-1 ml-8">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            {/* Right Column - Encryption Passphrase */}
            <div className="space-y-4">
              <p className="text-xs text-white/60 font-semibold uppercase tracking-wide mb-2">
                🔐 Encryption Passphrase
              </p>

              {/* Passphrase */}
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
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <input
                    name="passphrase"
                    data-testid="passphrase-input"
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Encryption Passphrase"
                    disabled={isLoading}
                    className="input-underline flex-1 text-white"
                  />
                </div>
                {errors.passphrase && (
                  <p className="text-xs text-red-300 mt-1 ml-8">
                    {errors.passphrase}
                  </p>
                )}
              </div>

              {/* Confirm Passphrase */}
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
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <input
                    name="confirmPassphrase"
                    data-testid="confirm-passphrase-input"
                    type="password"
                    value={confirmPassphrase}
                    onChange={(e) => setConfirmPassphrase(e.target.value)}
                    placeholder="Confirm Passphrase"
                    disabled={isLoading}
                    className="input-underline flex-1 text-white"
                  />
                </div>
                {errors.confirmPassphrase && (
                  <p className="text-xs text-red-300 mt-1 ml-8">
                    {errors.confirmPassphrase}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Checkbox - Full Width */}
          <div className="flex items-start gap-3 mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              required
              className="mt-0.5 w-5 h-5 rounded border-white/30 bg-white/10 text-purple-500 focus:ring-2 focus:ring-purple-400 cursor-pointer"
            />
            <span className="text-sm text-white/80 leading-relaxed">
              I understand and agree to the{" "}
              <button
                type="button"
                onClick={() => navigate("/privacy-policy")}
                className="text-purple-300 hover:text-purple-200 underline font-medium"
              >
                Privacy Policy
              </button>{" "}
              and acknowledge that my encryption passphrase is essential for
              account security and cannot be recovered if lost.
            </span>
          </div>
          {errors.terms && (
            <p className="text-xs text-red-300 ml-8 mt-1">{errors.terms}</p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-gradient py-3 rounded-xl text-base font-semibold mt-6"
          >
            Create Account & Generate Keys
          </button>
        </form>

        {/* Login Link */}
        <p className="text-center text-white/70 mt-6 text-sm">
          Already have an account?{" "}
          <button
            onClick={() => navigate("/login")}
            className="text-white font-semibold hover:underline transition-all"
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
