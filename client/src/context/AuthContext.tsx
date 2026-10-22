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
  const [activeFamilyMember, setActiveFamilyMember] = useState<string>('Self (John Doe)');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loginDemo = async (role: 'PATIENT' | 'DOCTOR' | 'SUPER_ADMIN' = 'PATIENT') => {
    try {
      let phone = '+919876543210';
      let name = 'John Doe (Patient)';
      if (role === 'DOCTOR') {
        phone = '+919876543211';
        name = 'Dr. Ananya Deshmukh (Cardiologist)';
      } else if (role === 'SUPER_ADMIN') {
        phone = '+919876543212';
        name = 'Dr. Rajesh Kumar (Enterprise Admin)';
      }

      const res = await api.verifyOTP(phone, '123456', name, role);
      if (res.success) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('auth_role', role);
        localStorage.removeItem('auth_guest');
        setToken(res.data.token);
        setUser(res.data.user);
      }
    } catch (err) {
      console.error('Demo auth failed:', err);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const isGuest = localStorage.getItem('auth_guest') === 'true';
      const storedToken = localStorage.getItem('token');

      if (isGuest && !storedToken) {
        // User intentionally testing or browsing as unauthenticated guest
        setUser(null);
        setToken(null);
        setIsLoading(false);
        return;
      }

      if (storedToken) {
        try {
          const res = await api.getCurrentUser();
          if (res.success) {
            setUser(res.data.user);
          } else {
            await loginDemo();
          }
        } catch {
          await loginDemo();
        }
      } else {
        await loginDemo();
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (phone: string, otp: string, fullName?: string, role?: string): Promise<boolean> => {
    try {
      const res = await api.verifyOTP(phone, otp, fullName, role);
      if (res.success) {
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
  };

  const switchRole = async (targetRole: 'PATIENT' | 'DOCTOR' | 'SUPER_ADMIN' | 'GUEST') => {
    setIsLoading(true);
    if (targetRole === 'GUEST') {
      logout();
      setIsLoading(false);
      return;
    }
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
