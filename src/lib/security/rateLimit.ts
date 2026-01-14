/**
 * In-memory rate limiting for KanbanPro API routes
 * Provides configurable rate limiting with automatic cleanup of expired entries
 */

/**
 * Configuration for a rate limit rule
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

/**
 * Result of a rate limit check
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of remaining requests in the current window */
  remaining: number;
  /** Unix timestamp (ms) when the rate limit window resets */
  resetTime: number;
  /** Total requests allowed per window */
  limit: number;
}

/**
 * Internal tracking data for a rate-limited identifier
 */
interface RateLimitEntry {
  /** Number of requests made in the current window */
  count: number;
  /** Start time of the current window */
  windowStart: number;
}

/**
 * Predefined rate limit configurations for different API operations
 */
export const rateLimitConfigs = {
  api: {
    /** Read operations: 100 requests per minute */
    read: {
      maxRequests: 100,
      windowMs: 60 * 1000,
    } as RateLimitConfig,

    /** Write operations: 30 requests per minute */
    write: {
      maxRequests: 30,
      windowMs: 60 * 1000,
    } as RateLimitConfig,

    /** Search operations: 20 requests per minute */
    search: {
      maxRequests: 20,
      windowMs: 60 * 1000,
    } as RateLimitConfig,
  },

  /** Authentication operations */
  auth: {
    /** Login attempts: 5 per minute */
    login: {
      maxRequests: 5,
      windowMs: 60 * 1000,
    } as RateLimitConfig,

    /** Password reset: 3 per hour */
    passwordReset: {
      maxRequests: 3,
      windowMs: 60 * 60 * 1000,
    } as RateLimitConfig,
  },
} as const;

/**
 * In-memory storage for rate limit entries
 * Key format: `${configKey}:${identifier}`
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Cleanup interval handle for automatic garbage collection
 */
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Cleanup interval duration (5 minutes)
 */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Starts the automatic cleanup interval for expired entries
 * This is called automatically on first use
 */
function startCleanupInterval(): void {
  if (cleanupIntervalId !== null) {
    return;
  }

  cleanupIntervalId = setInterval(() => {
    cleanupExpiredEntries();
  }, CLEANUP_INTERVAL_MS);

  // Don't prevent Node.js from exiting
  if (typeof cleanupIntervalId === 'object' && 'unref' in cleanupIntervalId) {
    cleanupIntervalId.unref();
  }
}

/**
 * Stops the automatic cleanup interval
 * Call this during application shutdown
 */
export function stopCleanupInterval(): void {
  if (cleanupIntervalId !== null) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
}

/**
 * Removes all expired entries from the rate limit store
 * An entry is expired if its window has passed
 *
 * @returns Number of entries removed
 */
export function cleanupExpiredEntries(): number {
  const now = Date.now();
  let removed = 0;

  for (const [key, entry] of rateLimitStore.entries()) {
    // Extract window duration from key (format: configKey:identifier)
    // We need to track window duration separately or calculate conservatively
    // Using a conservative max window of 1 hour for cleanup
    const maxWindowMs = 60 * 60 * 1000;

    if (now - entry.windowStart > maxWindowMs) {
      rateLimitStore.delete(key);
      removed++;
    }
  }

  return removed;
}

/**
 * Checks rate limit for a given identifier and configuration
 *
 * @param identifier - Unique identifier for the client (IP, user ID, API key, etc.)
 * @param config - Rate limit configuration to apply
 * @param configKey - Optional key to namespace rate limits (default: 'default')
 * @returns RateLimitResult with allowed status and metadata
 *
 * @example
 * // Check read rate limit for an IP
 * const result = checkRateLimit('192.168.1.1', rateLimitConfigs.api.read);
 * if (!result.allowed) {
 *   return new Response('Too Many Requests', { status: 429 });
 * }
 *
 * @example
 * // Check write rate limit with custom config
 * const result = checkRateLimit(userId, { maxRequests: 10, windowMs: 60000 }, 'comments');
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
  configKey: string = 'default'
): RateLimitResult {
  // Start cleanup interval on first use
  startCleanupInterval();

  const now = Date.now();
  const storeKey = `${configKey}:${identifier}`;
  const entry = rateLimitStore.get(storeKey);

  // Calculate reset time
  const windowStart = entry?.windowStart ?? now;
  const windowEnd = windowStart + config.windowMs;

  // Check if current window has expired
  if (!entry || now >= windowEnd) {
    // Start a new window
    rateLimitStore.set(storeKey, {
      count: 1,
      windowStart: now,
    });

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
      limit: config.maxRequests,
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: windowEnd,
      limit: config.maxRequests,
    };
  }

  // Increment counter and allow
  entry.count++;
  rateLimitStore.set(storeKey, entry);

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: windowEnd,
    limit: config.maxRequests,
  };
}

/**
 * Resets rate limit for a specific identifier
 * Useful for testing or administrative purposes
 *
 * @param identifier - Unique identifier to reset
 * @param configKey - Configuration key namespace (default: 'default')
 * @returns true if an entry was removed, false if none existed
 */
export function resetRateLimit(
  identifier: string,
  configKey: string = 'default'
): boolean {
  const storeKey = `${configKey}:${identifier}`;
  return rateLimitStore.delete(storeKey);
}

/**
 * Clears all rate limit entries
 * Use with caution - primarily for testing
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

/**
 * Gets the current count of rate limit entries
 * Useful for monitoring
 *
 * @returns Number of entries in the store
 */
export function getRateLimitStoreSize(): number {
  return rateLimitStore.size;
}

/**
 * Creates rate limit headers for HTTP responses
 *
 * @param result - Result from checkRateLimit
 * @returns Headers object with rate limit information
 */
export function createRateLimitHeaders(
  result: RateLimitResult
): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetTime.toString(),
    ...(result.allowed ? {} : { 'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString() }),
  };
}

/**
 * Middleware-style rate limiter that throws on limit exceeded
 *
 * @param identifier - Unique identifier for the client
 * @param config - Rate limit configuration
 * @param configKey - Configuration key namespace
 * @throws Error with code 'RATE_LIMIT_EXCEEDED' when limit is exceeded
 * @returns RateLimitResult if allowed
 */
export function enforceRateLimit(
  identifier: string,
  config: RateLimitConfig,
  configKey: string = 'default'
): RateLimitResult {
  const result = checkRateLimit(identifier, config, configKey);

  if (!result.allowed) {
    const error = new Error('Rate limit exceeded');
    (error as Error & { code: string }).code = 'RATE_LIMIT_EXCEEDED';
    (error as Error & { rateLimitResult: RateLimitResult }).rateLimitResult = result;
    throw error;
  }

  return result;
}
