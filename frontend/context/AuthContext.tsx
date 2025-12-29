'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { getUserInfoAPI, logoutAPI } from "@/lib/apiCalls";

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
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function checkAuth() {
      // Skip auth check if we're on the login page
      if (pathname === '/login') {
        setIsLoading(false);
        return;
      }

      const token = localStorage.getItem('auth_token');

      if (!token) {
        // No token, redirect to login
        router.push('/login');
        setIsLoading(false);
        return;
      }

      try {
        // Verify token is still valid
        const userInfo = await getUserInfoAPI(token);

        // Token valid, set user
        setUser({
          userId: userInfo.user_id,
          username: userInfo.username,
        });
        setIsLoading(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        // Token invalid or network error, clear and redirect to login
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_id');
        router.push('/login');
        setIsLoading(false);
      }
    }

    checkAuth();
  }, [pathname, router]);

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

    // Redirect to login
    router.push('/login');
  };

  const getUsername = () => {
    return user?.username || null;
  };

  const getToken = () => {
    return localStorage.getItem('auth_token');
  };

  // Show loading screen while checking auth (except on login page)
  if (isLoading && pathname !== '/login') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-xl font-medium text-gray-700 dark:text-gray-300">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  // Don't render children if not authenticated (except on login page)
  if (!user && pathname !== '/login' && !isLoading) {
    return null;
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
