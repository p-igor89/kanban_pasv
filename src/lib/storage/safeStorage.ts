/**
 * SSR-safe localStorage utilities for KanbanPro
 * Provides type-safe access to localStorage with graceful fallbacks
 */

/**
 * Theme values supported by KanbanPro
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * Storage keys used in the application
 */
export const STORAGE_KEYS = {
  THEME: 'kanbanpro-theme',
  SIDEBAR_COLLAPSED: 'kanbanpro-sidebar-collapsed',
  RECENT_BOARDS: 'kanbanpro-recent-boards',
  PREFERENCES: 'kanbanpro-preferences',
} as const;

/**
 * Type for storage key values
 */
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/**
 * Checks if code is running in a browser environment
 * @returns true if localStorage is available
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/**
 * Type guard function type for runtime validation
 */
export type TypeValidator<T> = (value: unknown) => value is T;

/**
 * Safely retrieves an item from localStorage with type validation
 *
 * @param key - Storage key to retrieve
 * @param defaultValue - Default value to return if key doesn't exist or validation fails
 * @param validator - Optional type validator function for runtime type checking
 * @returns The stored value if valid, otherwise the default value
 *
 * @example
 * // Simple usage with default
 * const count = safeGetItem('counter', 0);
 *
 * @example
 * // With type validation
 * const isString = (v: unknown): v is string => typeof v === 'string';
 * const name = safeGetItem('name', 'Anonymous', isString);
 *
 * @example
 * // With complex type validation
 * interface Settings { theme: string; fontSize: number; }
 * const isSettings = (v: unknown): v is Settings => {
 *   return typeof v === 'object' && v !== null &&
 *     'theme' in v && typeof (v as Settings).theme === 'string' &&
 *     'fontSize' in v && typeof (v as Settings).fontSize === 'number';
 * };
 * const settings = safeGetItem('settings', { theme: 'light', fontSize: 14 }, isSettings);
 */
export function safeGetItem<T>(key: string, defaultValue: T, validator?: TypeValidator<T>): T {
  // Return default during SSR
  if (!isBrowser()) {
    return defaultValue;
  }

  try {
    const item = window.localStorage.getItem(key);

    // Key doesn't exist
    if (item === null) {
      return defaultValue;
    }

    // Parse the stored value
    const parsed: unknown = JSON.parse(item);

    // If validator provided, use it for type checking
    if (validator) {
      return validator(parsed) ? parsed : defaultValue;
    }

    // Basic type check against default value
    if (typeof parsed === typeof defaultValue) {
      return parsed as T;
    }

    // For objects/arrays, do a basic structure check
    if (
      typeof defaultValue === 'object' &&
      defaultValue !== null &&
      typeof parsed === 'object' &&
      parsed !== null
    ) {
      return parsed as T;
    }

    return defaultValue;
  } catch {
    // JSON parse error or localStorage access error
    return defaultValue;
  }
}

/**
 * Safely stores an item in localStorage
 *
 * @param key - Storage key
 * @param value - Value to store (will be JSON stringified)
 * @returns true if successful, false otherwise
 *
 * @example
 * const success = safeSetItem('settings', { theme: 'dark' });
 * if (!success) {
 *   console.warn('Failed to save settings');
 * }
 */
export function safeSetItem<T>(key: string, value: T): boolean {
  // Can't store during SSR
  if (!isBrowser()) {
    return false;
  }

  try {
    const serialized = JSON.stringify(value);
    window.localStorage.setItem(key, serialized);
    return true;
  } catch {
    // Storage quota exceeded or other error
    return false;
  }
}

/**
 * Safely removes an item from localStorage
 *
 * @param key - Storage key to remove
 * @returns true if successful, false otherwise
 */
export function safeRemoveItem(key: string): boolean {
  if (!isBrowser()) {
    return false;
  }

  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates theme value
 */
const isTheme: TypeValidator<Theme> = (value: unknown): value is Theme => {
  return value === 'light' || value === 'dark' || value === 'system';
};

/**
 * Retrieves the stored theme preference
 *
 * @returns The stored theme or 'system' as default
 *
 * @example
 * const theme = getStoredTheme();
 * // Returns: 'light' | 'dark' | 'system'
 */
export function getStoredTheme(): Theme {
  return safeGetItem<Theme>(STORAGE_KEYS.THEME, 'system', isTheme);
}

/**
 * Stores the theme preference
 *
 * @param theme - Theme to store
 * @returns true if successful
 *
 * @example
 * setStoredTheme('dark');
 */
export function setStoredTheme(theme: Theme): boolean {
  return safeSetItem(STORAGE_KEYS.THEME, theme);
}

/**
 * Gets the resolved theme based on system preference
 * If stored theme is 'system', returns the system preference
 *
 * @returns 'light' or 'dark' (never 'system')
 */
export function getResolvedTheme(): 'light' | 'dark' {
  const stored = getStoredTheme();

  if (stored !== 'system') {
    return stored;
  }

  // Check system preference
  if (!isBrowser()) {
    return 'light'; // Default for SSR
  }

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

/**
 * Gets the sidebar collapsed state
 *
 * @returns true if sidebar should be collapsed
 */
export function getSidebarCollapsed(): boolean {
  return safeGetItem<boolean>(STORAGE_KEYS.SIDEBAR_COLLAPSED, false);
}

/**
 * Sets the sidebar collapsed state
 *
 * @param collapsed - Whether sidebar is collapsed
 * @returns true if successful
 */
export function setSidebarCollapsed(collapsed: boolean): boolean {
  return safeSetItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, collapsed);
}

/**
 * Recent board entry structure
 */
export interface RecentBoard {
  id: string;
  name: string;
  accessedAt: string;
}

/**
 * Type validator for RecentBoard array
 */
const isRecentBoardArray: TypeValidator<RecentBoard[]> = (
  value: unknown
): value is RecentBoard[] => {
  if (!Array.isArray(value)) {
    return false;
  }
  return value.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as RecentBoard).id === 'string' &&
      typeof (item as RecentBoard).name === 'string' &&
      typeof (item as RecentBoard).accessedAt === 'string'
  );
};

/**
 * Gets the list of recently accessed boards
 *
 * @param limit - Maximum number of boards to return (default: 5)
 * @returns Array of recent boards
 */
export function getRecentBoards(limit: number = 5): RecentBoard[] {
  const boards = safeGetItem<RecentBoard[]>(STORAGE_KEYS.RECENT_BOARDS, [], isRecentBoardArray);
  return boards.slice(0, limit);
}

/**
 * Adds or updates a board in the recent boards list
 *
 * @param board - Board to add/update
 * @returns true if successful
 */
export function addRecentBoard(board: { id: string; name: string }): boolean {
  const boards = getRecentBoards(10); // Get more to maintain a rolling list
  const now = new Date().toISOString();

  // Remove existing entry if present
  const filtered = boards.filter((b) => b.id !== board.id);

  // Add to front
  const updated: RecentBoard[] = [
    { id: board.id, name: board.name, accessedAt: now },
    ...filtered,
  ].slice(0, 10); // Keep max 10

  return safeSetItem(STORAGE_KEYS.RECENT_BOARDS, updated);
}

/**
 * Clears all KanbanPro storage items
 *
 * @returns true if all items were cleared successfully
 */
export function clearAllStorage(): boolean {
  if (!isBrowser()) {
    return false;
  }

  let success = true;
  for (const key of Object.values(STORAGE_KEYS)) {
    if (!safeRemoveItem(key)) {
      success = false;
    }
  }
  return success;
}
