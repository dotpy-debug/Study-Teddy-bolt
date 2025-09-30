/**
 * Enhanced API Client with comprehensive error handling, retry logic, and monitoring
 */

import type { ApiResponse, ApiError, ValidationError } from '../types/api';

// Configuration interfaces
interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  signal?: AbortSignal;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

// Error classes
class NetworkError extends Error {
  constructor(
    message: string,
    public isRetryable: boolean = false,
    public isTimeout: boolean = false,
    public metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

class ApiClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
    public metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/**
 * Enhanced API Client with retry logic, error handling, and monitoring
 */
export class ApiClient {
  private baseURL: string;
  private timeout: number;
  private retryConfig: RetryConfig;

  constructor(
    baseURL: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    timeout: number = 30000
  ) {
    this.baseURL = baseURL.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = timeout;
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
    };
  }

  /**
   * Main request method with retry logic and error handling
   */
  async request<T = unknown>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const url = this.buildURL(endpoint);
    const requestConfig = this.buildRequestConfig(config);
    
    let lastError: Error;
    const maxRetries = config.retries ?? this.retryConfig.maxRetries;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.makeRequest(url, requestConfig);
        return await this.handleResponse<T>(response);
      } catch (error: unknown) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (
          error instanceof ApiClientError ||
          (error instanceof NetworkError && !error.isRetryable) ||
          attempt === maxRetries
        ) {
          throw error;
        }

        // Calculate delay for next retry
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt),
          this.retryConfig.maxDelay
        );

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * GET request
   */
  async get<T = unknown>(endpoint: string, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = unknown>(endpoint: string, body?: unknown, config: Omit<RequestConfig, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body });
  }

  /**
   * PUT request
   */
  async put<T = unknown>(endpoint: string, body?: unknown, config: Omit<RequestConfig, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body });
  }

  /**
   * DELETE request
   */
  async delete<T = unknown>(endpoint: string, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  /**
   * PATCH request
   */
  async patch<T = unknown>(endpoint: string, body?: unknown, config: Omit<RequestConfig, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PATCH', body });
  }

  private buildURL(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const cleanBaseURL = this.baseURL.endsWith('/') ? this.baseURL.slice(0, -1) : this.baseURL;
    return `${cleanBaseURL}/${cleanEndpoint}`;
  }

  private buildRequestConfig(config: RequestConfig): RequestInit & { timeout?: number } {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...config.headers,
    };

    // Add auth token if available
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Add request ID for tracing
    headers['X-Request-ID'] = this.generateRequestId();

    return {
      method: config.method || 'GET',
      headers,
      signal: config.signal,
      timeout: config.timeout || this.timeout,
    };
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
    } catch (error: unknown) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new NetworkError(
          'Network request failed',
          true,
          false,
          { 
            url,
            method: config.method,
            originalError: error.message 
          }
        );
      }
      throw error;
    }
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (response.ok) {
      return this.parseSuccessResponse<T>(response);
    }

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = this.getRetryAfter(response);
      throw new NetworkError(
        'Rate limit exceeded',
        true,
        false,
        {
          retryAfter,
          limit: this.getRateLimit(response, 'limit'),
          remaining: this.getRateLimit(response, 'remaining'),
        }
      );
    }

    // Handle other errors
    throw await this.parseErrorResponse(response);
  }

  private async parseSuccessResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      const data = await response.json();
      
      if (data && typeof data === 'object' && 'success' in data) {
        return data as ApiResponse<T>;
      } else {
        return { data: data as T, success: true };
      }
    } else {
      // Handle non-JSON responses
      const text = await response.text();
      return { data: text as T, success: true };
    }
  }

  private async parseErrorResponse(response: Response): Promise<never> {
    let errorData: unknown;
    
    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        errorData = await response.json();
      } else {
        errorData = { message: await response.text() };
      }
    } catch {
      errorData = { message: 'Unknown error occurred' };
    }

    const error = errorData as ApiError;
    throw new ApiClientError(
      error.message || `HTTP ${response.status}: ${response.statusText}`,
      response.status,
      error.code,
      { response: errorData }
    );
  }

  private getAuthToken(): string | null {
    // Server-side rendering check
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      // Try localStorage first (persistent session)
      const session = localStorage.getItem('session');
      if (session) {
        const parsed = JSON.parse(session);
        return parsed.access_token || parsed.accessToken || null;
      }

      // Fallback to sessionStorage
      const token = sessionStorage.getItem('token') || sessionStorage.getItem('accessToken');
      return token;
    } catch {
      return null;
    }
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
    return value ? parseInt(value, 10) : 0;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export error classes for external use
export { NetworkError, ApiClientError };