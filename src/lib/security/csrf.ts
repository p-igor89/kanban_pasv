/**
 * CSRF (Cross-Site Request Forgery) Protection
 * Implements double-submit cookie pattern with cryptographic tokens
 */

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const CSRF_TOKEN_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const TOKEN_LENGTH = 32;

/**
 * Generate a cryptographically secure random token
 */
function generateToken(): string {
  // Use Web Crypto API for cryptographically secure random values
  const array = new Uint8Array(TOKEN_LENGTH);
  if (typeof window !== 'undefined') {
    crypto.getRandomValues(array);
  } else {
    // Node.js environment
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { randomBytes } = require('crypto');
    const buffer = randomBytes(TOKEN_LENGTH);
    array.set(buffer);
  }
  return Buffer.from(array).toString('base64url');
}

/**
 * Set CSRF token in cookie
 */
export async function setCsrfToken(): Promise<string> {
  const token = generateToken();
  const cookieStore = await cookies();

  cookieStore.set(CSRF_TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return token;
}

/**
 * Get CSRF token from cookie
 */
export async function getCsrfToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_TOKEN_NAME)?.value;
}

/**
 * Validate CSRF token from request
 */
export async function validateCsrfToken(request: NextRequest): Promise<boolean> {
  // Get token from cookie
  const cookieToken = request.cookies.get(CSRF_TOKEN_NAME)?.value;

  // Get token from header or body
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return constantTimeCompare(cookieToken, headerToken);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Middleware to validate CSRF token for state-changing requests
 */
export async function csrfProtection(request: NextRequest): Promise<NextResponse | null> {
  const method = request.method.toUpperCase();

  // Only check CSRF for state-changing methods
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const isValid = await validateCsrfToken(request);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid or missing CSRF token' }, { status: 403 });
    }
  }

  return null; // Valid request, continue
}

/**
 * Hook for client-side CSRF token management
 */
export function useCsrfToken() {
  // Get token from cookie (available in browser)
  if (typeof window === 'undefined') {
    return null;
  }

  const cookies = document.cookie.split(';');
  const csrfCookie = cookies.find((c) => c.trim().startsWith(`${CSRF_TOKEN_NAME}=`));

  if (!csrfCookie) {
    return null;
  }

  return csrfCookie.split('=')[1];
}
