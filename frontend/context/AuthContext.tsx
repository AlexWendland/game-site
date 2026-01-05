'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { getUserInfoAPI, logoutAPI } from "@/lib/apiCalls";
import { AuthResponse } from "@/proto/auth_pb";
import LoginForm from "@/components/auth/LoginForm";
import LoadingScreen from "@/components/auth/LoadingScreen";

type User = {
  userId: string;
  username: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  logout: () => void;
  getUsername: () => string | null;
  getToken: () => string | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem('auth_token');

      if (!token) {
        // No token, show login form
        setIsLoading(false);
        return;
      }

      try {
        // Verify token is still valid
        const userInfo = await getUserInfoAPI(token);

        // Token valid, set user (protobuf returns camelCase)
        setUser({
          userId: userInfo.userId,
          username: userInfo.username,
        });
        setIsLoading(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        // Token invalid or network error, clear and show login
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_id');
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  const handleLoginSuccess = (authResponse: AuthResponse) => {
    // Store token and user info (protobuf returns camelCase)
    localStorage.setItem('auth_token', authResponse.token);
    localStorage.setItem('user_id', authResponse.userId);

    // Set user in context
    // Note: We don't have username yet, will be filled by getUserInfoAPI
    // Or we could fetch it here, but for now just set userId
    setUser({
      userId: authResponse.userId,
      username: '', // Will be updated on next render
    });

    // Fetch full user info to get username
    getUserInfoAPI(authResponse.token).then((userInfo) => {
      setUser({
        userId: userInfo.userId,
        username: userInfo.username,
      });
    }).catch((error) => {
      console.error('Failed to fetch user info after login:', error);
    });
  };

  const logout = async () => {
    const token = localStorage.getItem('auth_token');

    // Call logout endpoint
    if (token) {
      try {
        await logoutAPI(token);
      } catch (error) {
        console.error('Logout request failed:', error);
      }
    }

    // Clear local storage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_id');
    setUser(null);
  };

  const getUsername = () => {
    return user?.username || null;
  };

  const getToken = () => {
    return localStorage.getItem('auth_token');
  };

  // Show loading screen while checking auth
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Show login form if not authenticated
  if (!user) {
    return <LoginForm onSuccess={handleLoginSuccess} />;
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, logout, getUsername, getToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
