import React, { useState } from "react";
import { Button } from "./Button";
import { Input } from "./Input";

interface PassphrasePromptProps {
  isOpen: boolean;
  onSuccess: () => void | Promise<void>;
  onCancel: () => void;
  onReAuthenticate: (passphrase: string) => Promise<boolean>;
}

export const PassphrasePrompt: React.FC<PassphrasePromptProps> = ({
  isOpen,
  onSuccess,
  onCancel,
  onReAuthenticate,
}) => {
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passphrase.trim()) {
      setError("Passphrase is required");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const success = await onReAuthenticate(passphrase);

      if (success) {
        setPassphrase("");
        // Support both sync and async onSuccess
        await Promise.resolve(onSuccess());
      } else {
        setError("Incorrect passphrase. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to authenticate. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setPassphrase("");
    setError("");
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
      <div className="card max-w-md w-full mx-4 p-8 animate-fade-in">
        <h2 className="text-2xl font-bold mb-2 text-gradient">
          Session Expired
        </h2>
        <p className="text-void-text-dim mb-6">
          Your session has expired. Please enter your passphrase to decrypt
          messages.
        </p>

        <form onSubmit={handleSubmit}>
          <Input
            label="Passphrase"
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Enter your passphrase"
            autoFocus
            disabled={isLoading}
          />

          {error && <p className="text-void-danger text-sm mt-2">{error}</p>}

          <div className="flex gap-3 mt-6">
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? "Authenticating..." : "Unlock"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </form>

        <p className="text-xs text-void-text-dim mt-4 text-center">
          Your passphrase is used to decrypt your private key locally.
        </p>
      </div>
    </div>
  );
};
