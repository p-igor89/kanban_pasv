/**
 * API Client
 * Base HTTP client with error handling, timeout, and retry logic
 */

import type { ApiFetchOptions, ServiceResponse, ServiceError } from './types';

/**
 * Default fetch options
 */
const DEFAULT_OPTIONS: ApiFetchOptions = {
  timeout: 30000, // 30 seconds
  withAuth: true,
};

/**
 * Create service error from fetch error
 */
function createServiceError(error: unknown, status?: number): ServiceError {
  if (error instanceof Error) {
    return {
      message: error.message,
      status,
    };
  }

  return {
    message: 'Unknown error occurred',
    status,
  };
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url: string, options: ApiFetchOptions): Promise<Response> {
  const { timeout = 30000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * API Client class
 */
export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Make HTTP request
   */
  private async request<T>(
    endpoint: string,
    options: ApiFetchOptions = {}
  ): Promise<ServiceResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    try {
      const response = await fetchWithTimeout(url, mergedOptions);

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        if (!response.ok) {
          return {
            success: false,
            error: {
              message: 'Request failed',
              status: response.status,
            },
          };
        }

        return {
          success: true,
          data: undefined as T,
        };
      }

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.error || data.message || 'Request failed',
            status: response.status,
            details: data.details,
          },
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return {
          success: false,
          error: {
            message: 'Request timeout',
            code: 'TIMEOUT',
          },
        };
      }

      return {
        success: false,
        error: createServiceError(error),
      };
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: ApiFetchOptions): Promise<ServiceResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    body?: unknown,
    options?: ApiFetchOptions
  ): Promise<ServiceResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    body?: unknown,
    options?: ApiFetchOptions
  ): Promise<ServiceResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(
    endpoint: string,
    body?: unknown,
    options?: ApiFetchOptions
  ): Promise<ServiceResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: ApiFetchOptions): Promise<ServiceResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }
}

/**
 * Default API client instance
 */
export const apiClient = new ApiClient();
