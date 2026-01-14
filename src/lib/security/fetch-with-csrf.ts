/**
 * Fetch wrapper that automatically includes CSRF token
 */

const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Get CSRF token from cookie
 */
function getCsrfTokenFromCookie(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookies = document.cookie.split(';');
  const csrfCookie = cookies.find((c) => c.trim().startsWith('csrf_token='));

  if (!csrfCookie) {
    return null;
  }

  return csrfCookie.split('=')[1];
}

/**
 * Fetch with automatic CSRF token injection
 */
export async function fetchWithCsrf(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const method = init?.method?.toUpperCase() || 'GET';

  // For state-changing requests, add CSRF token
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const token = getCsrfTokenFromCookie();

    if (!token) {
      // Try to get token from API
      const response = await fetch('/api/csrf');
      const data = await response.json();

      if (data.token) {
        // Token is now in cookie, retry
        return fetchWithCsrf(input, init);
      }

      throw new Error('Failed to get CSRF token');
    }

    // Add CSRF token to headers
    const headers = new Headers(init?.headers);
    headers.set(CSRF_HEADER_NAME, token);

    return fetch(input, {
      ...init,
      headers,
    });
  }

  // For GET requests, no CSRF token needed
  return fetch(input, init);
}
