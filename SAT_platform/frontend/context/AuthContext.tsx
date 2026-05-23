'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'admin';
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  register: (email: string, password: string, name: string, inviteToken: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
        try {
          const response = await api.get('/api/auth/profile');
          setUser(response.data);
        } catch {
          try {
            const refreshRes = await api.post('/api/auth/refresh');
            const newToken = refreshRes.data.access_token;
            localStorage.setItem('token', newToken);
            setToken(newToken);
            const profileRes = await api.get('/api/auth/profile');
            setUser(profileRes.data);
          } catch {
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
          }
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post('/api/auth/login', { email, password });
    const { access_token, user } = response.data;
    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(user);
  };

  const loginWithGoogle = async (credential: string) => {
    const response = await api.post('/api/auth/google', { credential });
    const { access_token, user } = response.data;
    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(user);
  };

  const register = async (email: string, password: string, name: string, inviteToken: string) => {
    const response = await api.post('/api/auth/register', {
      email,
      password,
      name,
      invite_token: inviteToken,
    });
    const { access_token, user } = response.data;
    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(user);
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // continue logout even if API call fails
    }
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, loginWithGoogle, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
