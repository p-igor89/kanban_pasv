/**
 * Comprehensive Rate Limiting System
 * Implements token bucket and sliding window algorithms
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the window
   */
  maxRequests: number;

  /**
   * Time window in milliseconds
   */
  windowMs: number;

  /**
   * Custom identifier function (defaults to IP address)
   */
  keyGenerator?: (request: NextRequest) => string;

  /**
   * Custom response when rate limit is exceeded
   */
  handler?: (request: NextRequest, retryAfter: number) => NextResponse;
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
  requests: number[]; // Timestamps of requests for sliding window
}

/**
 * In-memory store for rate limiting
 * In production, use Redis or similar distributed cache
 */
const store = new Map<string, RateLimitRecord>();

/**
 * Get client identifier from request
 */
function getClientIdentifier(request: NextRequest): string {
  // Try multiple headers for IP address (handle proxies)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  const ip = forwardedFor?.split(',')[0] || realIp || cfConnectingIp || 'unknown';

  // Also include user agent for better fingerprinting
  const userAgent = request.headers.get('user-agent') || 'unknown';

  return `${ip}:${userAgent.substring(0, 100)}`;
}

/**
 * Default rate limit exceeded handler
 */
function defaultHandler(request: NextRequest, retryAfter: number): NextResponse {
  return NextResponse.json(
    {
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: Math.ceil(retryAfter / 1000), // Convert to seconds
    },
    {
      status: 429,
      headers: {
        'Retry-After': Math.ceil(retryAfter / 1000).toString(),
        'X-RateLimit-Limit': '0',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + retryAfter).toISOString(),
      },
    }
  );
}

/**
 * Sliding window rate limiter
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    maxRequests,
    windowMs,
    keyGenerator = getClientIdentifier,
    handler = defaultHandler,
  } = config;

  return async function rateLimit(request: NextRequest): Promise<NextResponse | null> {
    const key = keyGenerator(request);
    const now = Date.now();

    // Get or create rate limit record
    let record = store.get(key);

    if (!record || now > record.resetAt) {
      // Create new record
      record = {
        count: 0,
        resetAt: now + windowMs,
        requests: [],
      };
      store.set(key, record);
    }

    // Remove requests outside the sliding window
    record.requests = record.requests.filter((timestamp) => now - timestamp < windowMs);

    // Check if rate limit exceeded
    if (record.requests.length >= maxRequests) {
      const oldestRequest = record.requests[0];
      const retryAfter = windowMs - (now - oldestRequest);

      return handler(request, retryAfter);
    }

    // Add current request
    record.requests.push(now);
    record.count++;

    // Add rate limit headers to response (will be handled by middleware)
    return null; // Allow request
  };
}

/**
 * Pre-configured rate limiters for different use cases
 */
export const rateLimiters = {
  /**
   * Strict rate limit for authentication endpoints
   * 5 requests per 15 minutes
   */
  auth: createRateLimiter({
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
  }),

  /**
   * Rate limit for write operations (POST, PUT, PATCH, DELETE)
   * 30 requests per minute
   */
  write: createRateLimiter({
    maxRequests: 30,
    windowMs: 60 * 1000,
  }),

  /**
   * Rate limit for read operations (GET)
   * 100 requests per minute
   */
  read: createRateLimiter({
    maxRequests: 100,
    windowMs: 60 * 1000,
  }),

  /**
   * Strict rate limit for sensitive operations
   * 10 requests per hour
   */
  sensitive: createRateLimiter({
    maxRequests: 10,
    windowMs: 60 * 60 * 1000,
  }),

  /**
   * Rate limit for search/query operations
   * 50 requests per minute
   */
  search: createRateLimiter({
    maxRequests: 50,
    windowMs: 60 * 1000,
  }),
};

/**
 * Cleanup expired rate limit records
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (now > record.resetAt && record.requests.length === 0) {
      store.delete(key);
    }
  }
}, 60000); // Clean up every minute

/**
 * Apply rate limiting based on request method and path
 */
export async function applyRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const { method, nextUrl } = request;
  const path = nextUrl.pathname;

  // Authentication endpoints - strictest limits
  if (path.startsWith('/api/auth/')) {
    return rateLimiters.auth(request);
  }

  // Sensitive operations
  if (path.includes('/members') || path.includes('/invite') || path.includes('/delete')) {
    return rateLimiters.sensitive(request);
  }

  // Search endpoints
  if (path.includes('/search')) {
    return rateLimiters.search(request);
  }

  // Write operations
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return rateLimiters.write(request);
  }

  // Read operations
  if (method === 'GET') {
    return rateLimiters.read(request);
  }

  return null;
}
