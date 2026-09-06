'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getToken, setToken, clearToken, setUnauthorizedHandler } from '../lib/api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(true);

  /* اگر توکن باطل شد، همان لحظه از پنل بیرون می‌آییم */
  useEffect(() => {
    setUnauthorizedHandler(() => setAdmin(null));
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!getToken()) {
        if (alive) {
          setAdmin(null);
          setChecking(false);
        }
        return;
      }
      try {
        const { admin: a } = await api.me();
        if (alive) setAdmin(a);
      } catch {
        clearToken();
        if (alive) setAdmin(null);
      } finally {
        if (alive) setChecking(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const login = useCallback(async (username, password) => {
    const { token, admin: a } = await api.login(username, password);
    setToken(token);
    setAdmin(a);
    return a;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setAdmin(null);
  }, []);

  /* بعد از تغییر رمز، توکن تازه را جایگزین می‌کنیم */
  const refreshSession = useCallback((token, a) => {
    setToken(token);
    setAdmin(a);
  }, []);

  return (
    <AuthContext.Provider value={{ admin, checking, login, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}
