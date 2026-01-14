/**
 * Security sanitization utilities for KanbanPro
 * Provides functions for sanitizing user input before database operations
 */

/**
 * UUID v4 regex pattern for validation
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Control characters regex (excluding common whitespace like space, tab, newline)
 * Matches ASCII control chars 0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F, and 0x7F
 */
const CONTROL_CHARS_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/**
 * Options for sanitizeString function
 */
export interface SanitizeStringOptions {
  /** Maximum allowed length (default: 1000) */
  maxLength?: number;
  /** Whether to trim whitespace (default: true) */
  trim?: boolean;
  /** Whether to remove control characters (default: true) */
  removeControlChars?: boolean;
  /** Whether to normalize unicode (default: true) */
  normalizeUnicode?: boolean;
}

/**
 * Escapes PostgreSQL LIKE/ILIKE special characters (%, _, \)
 * Use this when building LIKE queries to prevent SQL injection through wildcards
 *
 * @param input - The search input string to escape
 * @returns The escaped string safe for use in LIKE/ILIKE patterns
 *
 * @example
 * const search = sanitizeSearchInput('100% complete');
 * // Returns: '100\\% complete'
 * // Safe to use in: WHERE title ILIKE '%' || $1 || '%'
 */
export function sanitizeSearchInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Escape backslash first, then % and _
  // Order matters: \ must be escaped before we introduce more backslashes
  return input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * Sanitizes a string by trimming, limiting length, and removing control characters
 *
 * @param input - The string to sanitize
 * @param options - Sanitization options
 * @returns The sanitized string
 *
 * @example
 * const clean = sanitizeString('  Hello\x00World  ', { maxLength: 50 });
 * // Returns: 'HelloWorld'
 */
export function sanitizeString(input: string, options: SanitizeStringOptions = {}): string {
  const {
    maxLength = 1000,
    trim = true,
    removeControlChars = true,
    normalizeUnicode = true,
  } = options;

  if (typeof input !== 'string') {
    return '';
  }

  let result = input;

  // Normalize unicode to NFC form (canonical composition)
  if (normalizeUnicode) {
    result = result.normalize('NFC');
  }

  // Remove control characters
  if (removeControlChars) {
    result = result.replace(CONTROL_CHARS_REGEX, '');
  }

  // Trim whitespace
  if (trim) {
    result = result.trim();
  }

  // Limit length
  if (maxLength > 0 && result.length > maxLength) {
    result = result.slice(0, maxLength);
    // Re-trim in case we cut in the middle of whitespace
    if (trim) {
      result = result.trimEnd();
    }
  }

  return result;
}

/**
 * Validates and sanitizes a UUID string
 * Returns lowercase UUID if valid, null otherwise
 *
 * @param input - The UUID string to validate
 * @returns Lowercase UUID string if valid, null otherwise
 *
 * @example
 * sanitizeUUID('550E8400-E29B-41D4-A716-446655440000');
 * // Returns: '550e8400-e29b-41d4-a716-446655440000'
 *
 * sanitizeUUID('not-a-uuid');
 * // Returns: null
 */
export function sanitizeUUID(input: string | null | undefined): string | null {
  if (typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();

  if (!UUID_REGEX.test(trimmed)) {
    return null;
  }

  return trimmed.toLowerCase();
}

/**
 * Sanitizes an array of strings
 *
 * @param input - Array of strings to sanitize
 * @param options - Sanitization options for each string
 * @returns Array of sanitized strings (empty strings are filtered out)
 */
export function sanitizeStringArray(
  input: string[],
  options: SanitizeStringOptions = {}
): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter((item): item is string => typeof item === 'string')
    .map((item) => sanitizeString(item, options))
    .filter((item) => item.length > 0);
}

/**
 * Sanitizes a tag array with specific limits for KanbanPro
 * Max 10 tags, max 50 characters each
 *
 * @param tags - Array of tag strings
 * @returns Sanitized array of unique tags
 */
export function sanitizeTags(tags: string[]): string[] {
  const sanitized = sanitizeStringArray(tags, { maxLength: 50 });

  // Remove duplicates (case-insensitive) while preserving original case
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const tag of sanitized) {
    const lower = tag.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      unique.push(tag);
    }
  }

  // Limit to 10 tags
  return unique.slice(0, 10);
}

/**
 * Sanitizes HTML by escaping special characters
 * Use this for displaying user content in HTML context
 *
 * @param input - String potentially containing HTML
 * @returns String with HTML special characters escaped
 */
export function escapeHtml(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
