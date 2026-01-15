/**
 * Fetch wrapper that automatically includes CSRF token
 */

const CSRF_HEADER_NAME = 'x-csrf-token';

// Singleton promise for CSRF token fetch - prevents duplicate requests
let csrfFetchPromise: Promise<string | null> | null = null;

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
 * Fetch CSRF token with deduplication
 * Multiple concurrent calls will share the same request
 */
async function fetchCsrfToken(): Promise<string | null> {
  // If there's already a fetch in progress, wait for it
  if (csrfFetchPromise) {
    return csrfFetchPromise;
  }

  // Start a new fetch and store the promise
  csrfFetchPromise = (async () => {
    try {
      const response = await fetch('/api/csrf');
      const data = await response.json();
      return data.token || null;
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
      return null;
    } finally {
      // Clear the promise after a short delay to allow cookie to be set
      setTimeout(() => {
        csrfFetchPromise = null;
      }, 100);
    }
  })();

  return csrfFetchPromise;
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
    let token = getCsrfTokenFromCookie();

    if (!token) {
      // Fetch token with deduplication
      token = await fetchCsrfToken();

      if (!token) {
        // Try reading from cookie again (it may have been set by the fetch)
        token = getCsrfTokenFromCookie();
      }

      if (!token) {
        throw new Error('Failed to get CSRF token');
      }
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
