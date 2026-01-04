import { useEffect } from "react";
import { authService } from "../services/auth";
import { useAuthStore } from "../store/authStore";

export const useAuth = () => {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    useAuthStore.getState().initialize();
  }, []);

  const register = async (
    username: string,
    password: string,
    passphrase: string
  ) => {
    return authService.register(username, password, passphrase);
  };

  const login = async (
    username: string,
    password: string,
    passphrase: string
  ) => {
    return authService.login(username, password, passphrase);
  };

  const logout = async () => {
    return authService.logout();
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    register,
    login,
    logout,
  };
};
