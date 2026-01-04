import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SecureStorage } from "../crypto/storage";
import { authService } from "../services/auth";
import { useAuthStore } from "../store/authStore";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  checkAuth: () => boolean;
  handleAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated, initialize } = useAuthStore();

  const checkAuth = (): boolean => {
    const accountToken = SecureStorage.getAccountToken();
    const cryptoToken = SecureStorage.getCryptoToken();
    const username = SecureStorage.getUsername();
    const publicKey = SecureStorage.getPublicKey();

    return !!(accountToken && cryptoToken && username && publicKey);
  };

  const handleAuthError = () => {
    console.log("Auth error detected, logging out...");
    authService.logout();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    // Initialize auth state on mount
    initialize();
    setIsLoading(false);
  }, [initialize]);

  // Set up global error handler for 401 responses
  useEffect(() => {
    const handleUnauthorized = (event: CustomEvent) => {
      console.log("Unauthorized event received");
      handleAuthError();
    };

    window.addEventListener(
      "unauthorized" as any,
      handleUnauthorized as EventListener
    );

    return () => {
      window.removeEventListener(
        "unauthorized" as any,
        handleUnauthorized as EventListener
      );
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, checkAuth, handleAuthError }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
};
