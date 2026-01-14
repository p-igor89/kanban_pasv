/**
 * CSRF Token Provider
 * Manages CSRF token for the application
 */

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface CsrfContextValue {
  token: string | null;
  isLoading: boolean;
  refreshToken: () => Promise<void>;
}

const CsrfContext = createContext<CsrfContextValue>({
  token: null,
  isLoading: true,
  refreshToken: async () => {},
});

export function CsrfProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshToken = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/csrf');
      const data = await response.json();

      if (data.token) {
        setToken(data.token);
      }
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshToken();
  }, []);

  return (
    <CsrfContext.Provider value={{ token, isLoading, refreshToken }}>
      {children}
    </CsrfContext.Provider>
  );
}

/**
 * Hook to get CSRF token
 */
export function useCsrfToken() {
  const context = useContext(CsrfContext);

  if (!context) {
    throw new Error('useCsrfToken must be used within CsrfProvider');
  }

  return context;
}
