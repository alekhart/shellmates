'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

type SessionUser = {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_emoji: string;
  avatar_color: string;
  is_verified: boolean;
  created_at: string;
  last_login: string | null;
};

type UserSessionContextType = {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const UserSessionContext = createContext<UserSessionContextType>({
  user: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});

export function UserSessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/auth/me');
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <UserSessionContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </UserSessionContext.Provider>
  );
}

export function useUserSession() {
  return useContext(UserSessionContext);
}
