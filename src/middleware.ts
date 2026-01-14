import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { csrfProtection } from '@/lib/security/csrf';
import { applyRateLimit } from '@/lib/security/rate-limit';

export async function middleware(request: NextRequest) {
  // Apply rate limiting to all API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const rateLimitError = await applyRateLimit(request);
    if (rateLimitError) {
      return rateLimitError;
    }
  }

  // Apply CSRF protection to API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Skip CSRF for GET and OPTIONS requests
    // Skip CSRF for auth endpoints (handled by Supabase)
    // Skip CSRF token endpoint itself
    const skipCsrf =
      request.method === 'GET' ||
      request.method === 'OPTIONS' ||
      request.nextUrl.pathname.startsWith('/api/auth/') ||
      request.nextUrl.pathname === '/api/csrf';

    if (!skipCsrf) {
      const csrfError = await csrfProtection(request);
      if (csrfError) {
        return csrfError;
      }
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
