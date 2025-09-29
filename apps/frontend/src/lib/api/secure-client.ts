/**
 * Secure API client with CSRF protection and enhanced security
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import csrf from '../security/csrf';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second

interface SecureClientConfig extends AxiosRequestConfig {
  skipCSRF?: boolean;
  retryOnFailure?: boolean;
  maxRetries?: number;
}

class SecureAPIClient {
  private client: AxiosInstance;
  private refreshPromise: Promise<any> | null = null;

  constructor() {
    this.client = this.createClient();
    this.setupInterceptors();
  }

  /**
   * Create axios client instance
   */
  private createClient(): AxiosInstance {
    return axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      withCredentials: true, // Always send cookies
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        // Add CSRF token for state-changing requests
        const safeMethods = ['get', 'head', 'options'];
        const skipCSRF = (config as SecureClientConfig).skipCSRF;

        if (!skipCSRF && !safeMethods.includes(config.method?.toLowerCase() || '')) {
          try {
            const csrfHeaders = await csrf.getHeaders();
            config.headers = {
              ...config.headers,
              ...csrfHeaders,
            };
          } catch (error) {
            console.error('Failed to get CSRF token:', error);
            // Continue without CSRF token (server will reject if required)
          }
        }

        // Add auth token if available
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request ID for tracing
        config.headers['X-Request-ID'] = this.generateRequestId();

        // Add client version
        config.headers['X-Client-Version'] = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        // Handle successful response
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as SecureClientConfig & { _retry?: number };

        // Handle CSRF token errors
        if (error.response?.status === 403 && this.isCSRFError(error)) {
          // Refresh CSRF token and retry
          await csrf.refreshToken();
          return this.client(originalRequest);
        }

        // Handle unauthorized errors
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = 1;

          // Try to refresh auth token
          if (!this.refreshPromise) {
            this.refreshPromise = this.refreshAuthToken();
          }

          try {
            await this.refreshPromise;
            this.refreshPromise = null;

            // Retry original request with new token
            const token = this.getAuthToken();
            if (token && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return this.client(originalRequest);
          } catch (refreshError) {
            this.refreshPromise = null;
            // Redirect to login
            this.handleAuthError();
            return Promise.reject(refreshError);
          }
        }

        // Handle rate limiting
        if (error.response?.status === 429) {
          const retryAfter = this.getRetryAfter(error.response.headers);
          if (originalRequest.retryOnFailure !== false) {
            await this.delay(retryAfter);
            return this.client(originalRequest);
          }
        }

        // Handle network errors with retry
        if (!error.response && originalRequest.retryOnFailure !== false) {
          const retryCount = originalRequest._retry || 0;
          const maxRetries = originalRequest.maxRetries || MAX_RETRY_ATTEMPTS;

          if (retryCount < maxRetries) {
            originalRequest._retry = retryCount + 1;
            await this.delay(RETRY_DELAY * Math.pow(2, retryCount)); // Exponential backoff
            return this.client(originalRequest);
          }
        }

        return Promise.reject(this.enhanceError(error));
      }
    );
  }

  /**
   * Check if error is CSRF related
   */
  private isCSRFError(error: AxiosError): boolean {
    const errorMessage = error.response?.data?.message || '';
    return errorMessage.toLowerCase().includes('csrf');
  }

  /**
   * Get auth token from storage
   */
  private getAuthToken(): string | null {
    // Try to get from localStorage
    const token = localStorage.getItem('auth_token');
    if (token) return token;

    // Try to get from sessionStorage
    const sessionToken = sessionStorage.getItem('auth_token');
    if (sessionToken) return sessionToken;

    return null;
  }

  /**
   * Refresh authentication token
   */
  private async refreshAuthToken(): Promise<void> {
    try {
      const response = await this.client.post('/auth/refresh', {}, {
        skipCSRF: true, // Skip CSRF for refresh endpoint
      } as SecureClientConfig);

      const { accessToken } = response.data;
      if (accessToken) {
        localStorage.setItem('auth_token', accessToken);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Handle authentication errors
   */
  private handleAuthError(): void {
    // Clear auth data
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    csrf.clearToken();

    // Redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login?session=expired';
    }
  }

  /**
   * Get retry after delay from headers
   */
  private getRetryAfter(headers: any): number {
    const retryAfter = headers['retry-after'] || headers['x-rate-limit-reset'];
    if (retryAfter) {
      // If it's a number, it's seconds
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        return seconds * 1000;
      }
      // If it's a date, calculate delay
      const resetTime = new Date(retryAfter).getTime();
      const now = Date.now();
      return Math.max(0, resetTime - now);
    }
    return 5000; // Default 5 seconds
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate request ID for tracing
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Enhance error with additional information
   */
  private enhanceError(error: AxiosError): Error {
    const enhanced = new Error(this.getErrorMessage(error)) as any;
    enhanced.originalError = error;
    enhanced.status = error.response?.status;
    enhanced.data = error.response?.data;
    enhanced.requestId = error.config?.headers?.['X-Request-ID'];
    return enhanced;
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: AxiosError): string {
    if (error.response) {
      const { status, data } = error.response;

      // Check for custom error message
      if (data && typeof data === 'object' && 'message' in data) {
        return (data as any).message;
      }

      // Status-based messages
      switch (status) {
        case 400:
          return 'Invalid request. Please check your input.';
        case 401:
          return 'Authentication required. Please log in.';
        case 403:
          return 'Access denied. You don\'t have permission to perform this action.';
        case 404:
          return 'Resource not found.';
        case 429:
          return 'Too many requests. Please try again later.';
        case 500:
          return 'Server error. Please try again later.';
        case 502:
        case 503:
          return 'Service temporarily unavailable. Please try again later.';
        default:
          return `Request failed with status ${status}`;
      }
    }

    if (error.request) {
      return 'Network error. Please check your connection.';
    }

    return error.message || 'An unexpected error occurred';
  }

  /**
   * Public API methods
   */
  async get<T = any>(url: string, config?: SecureClientConfig): Promise<T> {
    const response = await this.client.get(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: SecureClientConfig): Promise<T> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: SecureClientConfig): Promise<T> {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: SecureClientConfig): Promise<T> {
    const response = await this.client.patch(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: SecureClientConfig): Promise<T> {
    const response = await this.client.delete(url, config);
    return response.data;
  }

  /**
   * Upload file with CSRF protection
   */
  async uploadFile(url: string, file: File, onProgress?: (progress: number) => void): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    // Add CSRF token to form data
    await csrf.addToFormData(formData);

    return this.client.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  }

  /**
   * Get the underlying axios instance
   */
  getClient(): AxiosInstance {
    return this.client;
  }
}

// Create singleton instance
const secureClient = new SecureAPIClient();

// Export the secure client
export default secureClient;

// Export convenience methods
export const api = {
  get: secureClient.get.bind(secureClient),
  post: secureClient.post.bind(secureClient),
  put: secureClient.put.bind(secureClient),
  patch: secureClient.patch.bind(secureClient),
  delete: secureClient.delete.bind(secureClient),
  uploadFile: secureClient.uploadFile.bind(secureClient),
  client: secureClient.getClient(),
};