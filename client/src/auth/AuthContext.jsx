import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api('/auth/me')
      .then((data) => {
        if (cancelled) return;
        setUser(data.user);
        setOrg(data.organization);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const applySession = useCallback((data) => {
    setUser(data.user);
    setOrg(data.organization);
  }, []);

  const login = useCallback(
    async (email, password) => {
      applySession(await api('/auth/login', { method: 'POST', body: { email, password } }));
    },
    [applySession]
  );

  const signup = useCallback(
    async (email, password, organizationName) => {
      applySession(await api('/auth/signup', { method: 'POST', body: { email, password, organizationName } }));
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    try { await api('/auth/logout', { method: 'POST' }); } finally {
      setUser(null);
      setOrg(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, org, setOrg, loading, login, signup, logout }),
    [user, org, loading, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
