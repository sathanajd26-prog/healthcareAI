import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  activeFamilyMember: string;
  setActiveFamilyMember: (name: string) => void;
  login: (phone: string, otp: string, fullName?: string, role?: string) => Promise<boolean>;
  logout: () => void;
  switchRole: (role: 'PATIENT' | 'DOCTOR' | 'SUPER_ADMIN' | 'GUEST') => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [activeFamilyMember, setActiveFamilyMember] = useState<string>('Self');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync active family member with user's name when user authenticates
  useEffect(() => {
    if (user?.fullName) {
      setActiveFamilyMember(`Self (${user.fullName})`);
    } else {
      setActiveFamilyMember('Self');
    }
  }, [user?.fullName]);

  /**
   * Explicit Demo Login - Strictly restricted to development environments.
   * Never called automatically on startup.
   */
  const loginDemo = async (role: 'PATIENT' | 'DOCTOR' | 'SUPER_ADMIN' = 'PATIENT') => {
    // 1. Strict production safeguard
    if (import.meta.env.PROD) {
      console.error('[Security Violation] Demo credentials and shortcuts are strictly forbidden in production.');
      return;
    }

    // 2. Explicit development flag verification
    const isDev = import.meta.env.DEV;
    const devShortcutAllowed = import.meta.env.VITE_ENABLE_DEV_DEMO !== 'false';
    if (!isDev || !devShortcutAllowed) {
      console.warn('[Security] Demo login shortcut is disabled in this environment.');
      return;
    }

    try {
      let phone = '+919876543210';
      let name = 'Demo Patient';
      if (role === 'DOCTOR') {
        phone = '+919876543211';
        name = 'Dr. Ananya Deshmukh (Cardiologist)';
      } else if (role === 'SUPER_ADMIN') {
        phone = '+919876543212';
        name = 'Dr. Rajesh Kumar (Enterprise Admin)';
      }

      const res = await api.verifyOTP(phone, '123456', name, role);
      if (res.success && res.data?.token) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('auth_role', role);
        localStorage.removeItem('auth_guest');
        setToken(res.data.token);
        setUser(res.data.user);
      } else {
        console.error('Demo auth rejected by server:', res.error);
      }
    } catch (err) {
      console.error('Demo auth failed:', err);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');

      if (storedToken) {
        try {
          const res = await api.getCurrentUser();
          if (res.success && res.data?.user) {
            setUser(res.data.user);
            setToken(storedToken);
          } else {
            // Token expired or invalid on server
            localStorage.removeItem('token');
            localStorage.removeItem('auth_role');
            setToken(null);
            setUser(null);
          }
        } catch {
          // Network failure or invalid token
          localStorage.removeItem('token');
          localStorage.removeItem('auth_role');
          setToken(null);
          setUser(null);
        }
      } else {
        // Unauthenticated visitor
        setUser(null);
        setToken(null);
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (phone: string, otp: string, fullName?: string, role?: string): Promise<boolean> => {
    try {
      const res = await api.verifyOTP(phone, otp, fullName, role);
      if (res.success && res.data?.token) {
        localStorage.setItem('token', res.data.token);
        localStorage.removeItem('auth_guest');
        setToken(res.data.token);
        setUser(res.data.user);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = () => {
    api.logout().catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('auth_role');
    localStorage.setItem('auth_guest', 'true');
    setToken(null);
    setUser(null);
    setActiveFamilyMember('Self');
  };

  const switchRole = async (targetRole: 'PATIENT' | 'DOCTOR' | 'SUPER_ADMIN' | 'GUEST') => {
    setIsLoading(true);
    if (targetRole === 'GUEST') {
      logout();
      setIsLoading(false);
      return;
    }
    // Only allows explicit developer trigger in development mode
    await loginDemo(targetRole);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        activeFamilyMember,
        setActiveFamilyMember,
        login,
        logout,
        switchRole,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
