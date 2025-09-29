/**
 * CSRF Token Management for Frontend
 */

import Cookies from 'js-cookie';

const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'X-XSRF-TOKEN';
const CSRF_LOCAL_STORAGE_KEY = 'csrf_token';

class CSRFManager {
  private token: string | null = null;
  private tokenPromise: Promise<string> | null = null;

  /**
   * Initialize CSRF manager
   */
  constructor() {
    // Try to load token from cookie or local storage
    this.loadToken();
  }

  /**
   * Load token from storage
   */
  private loadToken(): void {
    // Try cookie first
    const cookieToken = Cookies.get(CSRF_COOKIE_NAME);
    if (cookieToken) {
      this.token = cookieToken;
      return;
    }

    // Try local storage as fallback
    const storageToken = localStorage.getItem(CSRF_LOCAL_STORAGE_KEY);
    if (storageToken) {
      this.token = storageToken;
    }
  }

  /**
   * Save token to storage
   */
  private saveToken(token: string): void {
    this.token = token;

    // Save to local storage as backup
    localStorage.setItem(CSRF_LOCAL_STORAGE_KEY, token);

    // Cookie is set by the server, but we can read it
    const cookieToken = Cookies.get(CSRF_COOKIE_NAME);
    if (cookieToken && cookieToken !== token) {
      // Token mismatch, use the cookie value
      this.token = cookieToken;
      localStorage.setItem(CSRF_LOCAL_STORAGE_KEY, cookieToken);
    }
  }

  /**
   * Get CSRF token
   */
  async getToken(): Promise<string> {
    // If we have a valid token, return it
    if (this.token && this.isTokenValid()) {
      return this.token;
    }

    // If we're already fetching a token, wait for that request
    if (this.tokenPromise) {
      return this.tokenPromise;
    }

    // Fetch a new token
    this.tokenPromise = this.fetchNewToken();

    try {
      const token = await this.tokenPromise;
      this.saveToken(token);
      return token;
    } finally {
      this.tokenPromise = null;
    }
  }

  /**
   * Fetch a new CSRF token from the server
   */
  private async fetchNewToken(): Promise<string> {
    try {
      const response = await fetch('/api/auth/csrf-token', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }

      // Check if token is in response header
      const headerToken = response.headers.get('X-CSRF-Token');
      if (headerToken) {
        return headerToken;
      }

      // Check if token is in response body
      const data = await response.json();
      if (data.token) {
        return data.token;
      }

      // Check if token was set in cookie
      const cookieToken = Cookies.get(CSRF_COOKIE_NAME);
      if (cookieToken) {
        return cookieToken;
      }

      throw new Error('No CSRF token received from server');
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
      throw error;
    }
  }

  /**
   * Check if the current token is valid
   */
  private isTokenValid(): boolean {
    if (!this.token) {
      return false;
    }

    // Check if cookie still exists and matches
    const cookieToken = Cookies.get(CSRF_COOKIE_NAME);
    if (cookieToken && cookieToken !== this.token) {
      // Cookie has changed, our token is invalid
      return false;
    }

    // Token is valid
    return true;
  }

  /**
   * Refresh the CSRF token
   */
  async refreshToken(): Promise<string> {
    this.token = null;
    localStorage.removeItem(CSRF_LOCAL_STORAGE_KEY);
    return this.getToken();
  }

  /**
   * Clear the CSRF token (for logout)
   */
  clearToken(): void {
    this.token = null;
    localStorage.removeItem(CSRF_LOCAL_STORAGE_KEY);
    Cookies.remove(CSRF_COOKIE_NAME);
  }

  /**
   * Get CSRF headers for API requests
   */
  async getHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken();
    return {
      [CSRF_HEADER_NAME]: token,
    };
  }

  /**
   * Add CSRF token to FormData
   */
  async addToFormData(formData: FormData): Promise<FormData> {
    const token = await this.getToken();
    formData.append('_csrf', token);
    return formData;
  }

  /**
   * Add CSRF token to request body
   */
  async addToBody(body: any): Promise<any> {
    const token = await this.getToken();
    return {
      ...body,
      _csrf: token,
    };
  }
}

// Create singleton instance
const csrfManager = new CSRFManager();

/**
 * Public API
 */
export const csrf = {
  /**
   * Get CSRF token
   */
  getToken: () => csrfManager.getToken(),

  /**
   * Refresh CSRF token
   */
  refreshToken: () => csrfManager.refreshToken(),

  /**
   * Clear CSRF token (for logout)
   */
  clearToken: () => csrfManager.clearToken(),

  /**
   * Get headers with CSRF token
   */
  getHeaders: () => csrfManager.getHeaders(),

  /**
   * Add CSRF token to FormData
   */
  addToFormData: (formData: FormData) => csrfManager.addToFormData(formData),

  /**
   * Add CSRF token to request body
   */
  addToBody: (body: any) => csrfManager.addToBody(body),
};

/**
 * Axios interceptor for CSRF protection
 */
export const createCSRFInterceptor = () => {
  return async (config: any) => {
    // Skip CSRF for safe methods
    const safeMethods = ['get', 'head', 'options'];
    if (safeMethods.includes(config.method?.toLowerCase() || '')) {
      return config;
    }

    // Add CSRF token to headers
    const csrfHeaders = await csrf.getHeaders();
    config.headers = {
      ...config.headers,
      ...csrfHeaders,
    };

    return config;
  };
};

/**
 * Fetch wrapper with CSRF protection
 */
export const secureFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const method = options.method?.toUpperCase() || 'GET';

  // Skip CSRF for safe methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(method)) {
    return fetch(url, options);
  }

  // Add CSRF token to headers
  const csrfHeaders = await csrf.getHeaders();
  const headers = {
    ...options.headers,
    ...csrfHeaders,
  };

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Always include credentials for CSRF
  });
};

export default csrf;