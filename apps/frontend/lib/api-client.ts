/**
 * Enhanced API Client with Comprehensive Error Handling
 *
 * This module provides a robust API client that integrates with the error handling system,
 * includes retry logic, and provides consistent error reporting across the application.
 */

import {
  ApiError,
  NetworkError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  RateLimitError,
  ErrorParser,
  ErrorReporter,
  isRetryableError,
  getRetryDelay,
} from './errors';

interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  signal?: AbortSignal;
}

interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  timestamp?: string;
}

export class ApiClient {
  private baseURL: string;
  private timeout: number;
  private retries: number;
  private defaultHeaders: Record<string, string>;

  constructor(config: ApiClientConfig = {}) {
    this.baseURL = config.baseURL || process.env.NEXT_PUBLIC_API_URL || '';
    this.timeout = config.timeout || 30000; // 30 seconds
    this.retries = config.retries || 3;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
  }

  /**
   * Make an API request with error handling and retry logic
   */
  async request<T = any>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const url = this.buildURL(endpoint);
    const requestConfig = this.buildRequestConfig(config);
    const maxRetries = config.retries ?? this.retries;

    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const response = await this.makeRequest(url, requestConfig);
        return await this.handleResponse<T>(response);
      } catch (error) {
        lastError = error;

        // Don't retry on the last attempt
        if (attempt > maxRetries) {
          break;
        }

        // Check if error is retryable
        if (!isRetryableError(error)) {
          break;
        }

        // Wait before retrying
        const delay = getRetryDelay(error, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));

        // Log retry attempt
        console.warn(`API request failed, retrying (${attempt}/${maxRetries}):`, {
          url,
          error: error instanceof Error ? error.message : String(error),
          attempt,
          nextDelay: attempt < maxRetries ? getRetryDelay(error, attempt + 1) : null,
        });
      }
    }

    // Report the final error
    await ErrorReporter.reportError(lastError, {
      endpoint,
      config,
      url,
      attempts: maxRetries + 1,
    });

    throw lastError;
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, body?: any, config: Omit<RequestConfig, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body });
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, body?: any, config: Omit<RequestConfig, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(endpoint: string, body?: any, config: Omit<RequestConfig, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PATCH', body });
  }

  private buildURL(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const cleanBaseURL = this.baseURL.endsWith('/') ? this.baseURL.slice(0, -1) : this.baseURL;
    return `${cleanBaseURL}/${cleanEndpoint}`;
  }

  private buildRequestConfig(config: RequestConfig): RequestInit & { timeout?: number } {
    const headers = { ...this.defaultHeaders, ...config.headers };

    // Add authentication header if available
    const token = this.getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // Add request ID for tracking
    headers['X-Request-ID'] = this.generateRequestId();

    const requestConfig: RequestInit & { timeout?: number } = {
      method: config.method || 'GET',
      headers,
      signal: config.signal,
      timeout: config.timeout || this.timeout,
    };

    // Add body for non-GET requests
    if (config.body && config.method !== 'GET') {
      if (config.body instanceof FormData) {
        requestConfig.body = config.body;
        // Remove Content-Type header for FormData (browser will set it)
        delete headers['Content-Type'];
      } else {
        requestConfig.body = JSON.stringify(config.body);
      }
    }

    return requestConfig;
  }

  private async makeRequest(url: string, config: RequestInit & { timeout?: number }): Promise<Response> {
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new NetworkError('Request timeout', false, true, { timeout: config.timeout }));
      }, config.timeout);
    });

    try {
      // Race between fetch and timeout
      const response = await Promise.race([
        fetch(url, config),
        timeoutPromise,
      ]);

      return response;
    } catch (error) {
      // Handle fetch errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw ErrorParser.parseNetworkError(error);
      }

      if (error instanceof NetworkError) {
        throw error;
      }

      // Handle other fetch errors
      throw new NetworkError(
        'Network request failed',
        !navigator.onLine,
        true,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    // Handle successful responses
    if (response.ok) {
      return await this.parseSuccessResponse<T>(response);
    }

    // Handle error responses
    const apiError = await ErrorParser.parseApiError(response);

    // Map specific status codes to custom error types
    switch (response.status) {
      case 401:
        throw new AuthenticationError(apiError.message, { response: apiError.data });
      case 403:
        throw new AuthorizationError(apiError.message, { response: apiError.data });
      case 422:
        throw ErrorParser.parseValidationError(apiError.data || { message: apiError.message });
      case 429:
        throw new RateLimitError(
          apiError.message,
          this.getRetryAfter(response),
          this.getRateLimit(response, 'limit'),
          this.getRateLimit(response, 'remaining'),
          { response: apiError.data }
        );
      default:
        throw apiError;
    }
  }

  private async parseSuccessResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      const data = await response.json();

      // Handle different response formats
      if (data && typeof data === 'object' && 'success' in data) {
        // Backend returns structured response
        return data as ApiResponse<T>;
      } else {
        // Raw JSON data
        return {
          data: data as T,
          success: true,
        };
      }
    } else {
      // Non-JSON response
      const text = await response.text();
      return {
        data: text as unknown as T,
        success: true,
      };
    }
  }

  private getAuthToken(): string | null {
    // Try to get token from various sources
    if (typeof window === 'undefined') {
      return null; // Server-side
    }

    // Check localStorage
    try {
      const session = localStorage.getItem('session');
      if (session) {
        const parsed = JSON.parse(session);
        return parsed.token || parsed.accessToken || null;
      }
    } catch {
      // Ignore parsing errors
    }

    // Check sessionStorage
    try {
      const token = sessionStorage.getItem('token') || sessionStorage.getItem('accessToken');
      return token;
    } catch {
      // Ignore storage errors
    }

    return null;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getRetryAfter(response: Response): number | undefined {
    const retryAfter = response.headers.get('retry-after');
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      return isNaN(seconds) ? undefined : seconds * 1000; // Convert to milliseconds
    }
    return undefined;
  }

  private getRateLimit(response: Response, type: 'limit' | 'remaining'): number {
    const header = type === 'limit' ? 'x-ratelimit-limit' : 'x-ratelimit-remaining';
    const value = response.headers.get(header);
    return value ? parseInt(value, 10) || 0 : 0;
  }
}

// Default API client instance
export const apiClient = new ApiClient();

// Utility functions for common API patterns
export async function withErrorHandling<T>(
  apiCall: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    await ErrorReporter.reportError(error, context);
    throw error;
  }
}

// React hook for API calls with error handling
export function useApiCall() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);

  const execute = React.useCallback(async <T>(
    apiCall: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await withErrorHandling(apiCall, context);
      return result;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading, error };
}

// Import React for the hook
import React from 'react';