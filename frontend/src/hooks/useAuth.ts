import { useState, useEffect } from 'react';
import { getAccessToken } from '@/api/client';

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  role: string | null;
}

/**
 * Simple auth state hook derived from the access token payload.
 * Listens for token changes after refresh.
 * SFP-135, SFP-145, SFP-151, SFP-165, SFP-194
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>(() => parseToken(getAccessToken()));

  useEffect(() => {
    // Re-parse on storage changes (e.g., multi-tab logout)
    function handleStorage(): void {
      setState(parseToken(getAccessToken()));
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return state;
}

function parseToken(token: string | null): AuthState {
  if (!token) return { isAuthenticated: false, userId: null, role: null };
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as {
      sub: string;
      role: string;
      exp: number;
    };
    if (payload.exp * 1000 < Date.now()) {
      return { isAuthenticated: false, userId: null, role: null };
    }
    return { isAuthenticated: true, userId: payload.sub, role: payload.role };
  } catch {
    return { isAuthenticated: false, userId: null, role: null };
  }
}
