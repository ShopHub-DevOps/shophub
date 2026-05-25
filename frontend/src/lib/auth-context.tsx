'use client';

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { api, AuthResponse } from './api-client';
import { StoredUser, authStorage } from './auth-storage';

interface AuthContextValue {
  user: StoredUser | null;
  isLoading: boolean;
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signInWithWallet: (message: string, signature: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = authStorage.getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    api
      .me()
      .then((fresh) => {
        authStorage.setUser(fresh);
        setUser(fresh);
      })
      .catch(() => {
        authStorage.clear();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const apply = useCallback((res: AuthResponse) => {
    authStorage.setToken(res.accessToken);
    authStorage.setUser(res.user);
    setUser(res.user);
  }, []);

  const register = useCallback(
    async (email: string, password: string) => {
      apply(await api.register(email, password));
    },
    [apply],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      apply(await api.login(email, password));
    },
    [apply],
  );

  const signInWithWallet = useCallback(
    async (message: string, signature: string) => {
      apply(await api.siweVerify(message, signature));
    },
    [apply],
  );

  const logout = useCallback(() => {
    authStorage.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, register, login, signInWithWallet, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
