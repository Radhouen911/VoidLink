import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/common/Button";
import { useAuth } from "../hooks/useAuth";

export const Chat: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-void-black text-void-text">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">VoidLink Chat</h1>
          <div className="flex items-center gap-4">
            <span className="text-void-text-dim">
              Welcome, {user?.username}
            </span>
            <Button variant="secondary" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>

        <div className="card p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Chat Interface</h2>
          <p className="text-void-text-dim mb-6">
            Full chat interface coming soon. Your account is set up and ready!
          </p>
          <div className="space-y-2 text-left max-w-md mx-auto">
            <p className="text-sm text-void-text-dim">
              <span className="text-void-success">✓</span> Account authenticated
            </p>
            <p className="text-sm text-void-text-dim">
              <span className="text-void-success">✓</span> Crypto keys generated
            </p>
            <p className="text-sm text-void-text-dim">
              <span className="text-void-success">✓</span> End-to-end encryption
              ready
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
