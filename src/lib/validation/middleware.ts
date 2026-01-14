/**
 * Validation middleware for API routes
 * Provides consistent validation and sanitization across all endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize string input to prevent XSS attacks
 */
export function sanitizeString(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] }).trim();
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = { ...obj };

  for (const key in sanitized) {
    const value = sanitized[key];

    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value) as T[Extract<keyof T, string>];
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'string' ? sanitizeString(item) : item
      ) as T[Extract<keyof T, string>];
    } else if (value !== null && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>) as T[Extract<
        keyof T,
        string
      >];
    }
  }

  return sanitized;
}

/**
 * Validate request body against Zod schema
 */
export async function validateBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: NextResponse }> {
  try {
    const body = await request.json();

    // Sanitize input before validation
    const sanitized = sanitizeObject(body);

    // Validate with Zod schema
    const validated = schema.parse(sanitized);

    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: NextResponse.json(
          {
            error: 'Validation failed',
            details: error.issues.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        ),
      };
    }

    // JSON parse error
    return {
      success: false,
      error: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }),
    };
  }
}

/**
 * Validate query parameters against Zod schema
 */
export function validateQuery<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; error: NextResponse } {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());

    // Sanitize input before validation
    const sanitized = sanitizeObject(searchParams);

    // Validate with Zod schema
    const validated = schema.parse(sanitized);

    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: NextResponse.json(
          {
            error: 'Validation failed',
            details: error.issues.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        ),
      };
    }

    return {
      success: false,
      error: NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 }),
    };
  }
}

/**
 * Validate URL path parameters against Zod schema
 */
export function validateParams<T>(
  params: Record<string, string>,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; error: NextResponse } {
  try {
    // Sanitize input before validation
    const sanitized = sanitizeObject(params);

    // Validate with Zod schema
    const validated = schema.parse(sanitized);

    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: NextResponse.json(
          {
            error: 'Validation failed',
            details: error.issues.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        ),
      };
    }

    return {
      success: false,
      error: NextResponse.json({ error: 'Invalid URL parameters' }, { status: 400 }),
    };
  }
}

/**
 * Rate limiting for validation errors
 * Prevents brute force attacks by limiting failed validation attempts
 */
const validationAttempts = new Map<string, { count: number; resetAt: number }>();

export function checkValidationRateLimit(
  identifier: string,
  maxAttempts: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const record = validationAttempts.get(identifier);

  if (!record || now > record.resetAt) {
    validationAttempts.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= maxAttempts) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Clean up expired rate limit records
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of validationAttempts.entries()) {
    if (now > record.resetAt) {
      validationAttempts.delete(key);
    }
  }
}, 60000); // Clean up every minute
