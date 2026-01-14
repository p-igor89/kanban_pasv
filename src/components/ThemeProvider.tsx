'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  type Theme,
  getStoredTheme,
  setStoredTheme,
  getResolvedTheme,
} from '@/lib/storage/safeStorage';

/**
 * The resolved theme that is actually applied to the DOM
 * Always 'light' or 'dark', never 'system'
 */
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  /** The user's theme preference (can be 'system') */
  theme: Theme;
  /** The actual applied theme (resolved from system preference if needed) */
  resolvedTheme: ResolvedTheme;
  /** Set the theme preference */
  setTheme: (theme: Theme) => void;
  /** Toggle between light and dark (skips system) */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Hook to access theme context
 * @throws Error if used outside of ThemeProvider
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Default theme to use before hydration (defaults to 'system') */
  defaultTheme?: Theme;
}

/**
 * Applies the resolved theme to the DOM
 */
function applyThemeToDOM(resolvedTheme: ResolvedTheme, theme: Theme): void {
  // Set data-theme attribute for CSS variables
  document.documentElement.setAttribute('data-theme', resolvedTheme);

  // Add/remove 'dark' class for Tailwind dark: classes
  if (resolvedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  // Set color-scheme for native browser elements
  document.documentElement.style.colorScheme = resolvedTheme;

  // Store the raw theme preference (including 'system')
  setStoredTheme(theme);
}

/**
 * Gets the system color scheme preference
 */
function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Resolves the theme preference to an actual theme
 */
function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
}

export default function ThemeProvider({ children, defaultTheme = 'system' }: ThemeProviderProps) {
  // Track hydration state to prevent SSR mismatch
  const [mounted, setMounted] = useState(false);

  // Theme preference (can be 'system')
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  // The actual resolved theme
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(defaultTheme)
  );

  // Initialize theme from storage on mount
  useEffect(() => {
    setMounted(true);

    const storedTheme = getStoredTheme();
    const resolved = getResolvedTheme();

    setThemeState(storedTheme);
    setResolvedTheme(resolved);

    // Apply theme to DOM immediately to prevent flash
    applyThemeToDOM(resolved, storedTheme);
  }, []);

  // Listen for system theme changes when theme is set to 'system'
  useEffect(() => {
    if (!mounted || theme !== 'system') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      const newResolvedTheme: ResolvedTheme = e.matches ? 'dark' : 'light';
      setResolvedTheme(newResolvedTheme);
      applyThemeToDOM(newResolvedTheme, 'system');
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [mounted, theme]);

  // Set theme preference
  const setTheme = useCallback((newTheme: Theme) => {
    const resolved = resolveTheme(newTheme);
    setThemeState(newTheme);
    setResolvedTheme(resolved);
    applyThemeToDOM(resolved, newTheme);
  }, []);

  // Toggle between light and dark (for quick toggle button)
  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<ThemeContextType>(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
    }),
    [theme, resolvedTheme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}
