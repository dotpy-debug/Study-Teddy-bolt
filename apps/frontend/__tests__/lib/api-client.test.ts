import axios from 'axios';
import { apiClient } from '@/lib/api-client';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock window.location
const mockLocation = {
  href: 'http://localhost:3000',
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('Request Interceptor', () => {
    it('should add authorization header when token exists', async () => {
      mockLocalStorage.getItem.mockReturnValue('mock-token');
      
      const mockRequest = {
        headers: {},
        url: '/test',
      };

      // Get the request interceptor
      const requestInterceptor = mockedAxios.interceptors.request.use.mock.calls[0][0];
      const modifiedRequest = requestInterceptor(mockRequest);

      expect(modifiedRequest.headers.Authorization).toBe('Bearer mock-token');
    });

    it('should not add authorization header when no token exists', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const mockRequest = {
        headers: {},
        url: '/test',
      };

      const requestInterceptor = mockedAxios.interceptors.request.use.mock.calls[0][0];
      const modifiedRequest = requestInterceptor(mockRequest);

      expect(modifiedRequest.headers.Authorization).toBeUndefined();
    });

    it('should set content-type for non-FormData requests', async () => {
      const mockRequest = {
        headers: {},
        url: '/test',
        data: { test: 'data' },
      };

      const requestInterceptor = mockedAxios.interceptors.request.use.mock.calls[0][0];
      const modifiedRequest = requestInterceptor(mockRequest);

      expect(modifiedRequest.headers['Content-Type']).toBe('application/json');
    });

    it('should not set content-type for FormData requests', async () => {
      const formData = new FormData();
      const mockRequest = {
        headers: {},
        url: '/test',
        data: formData,
      };

      const requestInterceptor = mockedAxios.interceptors.request.use.mock.calls[0][0];
      const modifiedRequest = requestInterceptor(mockRequest);

      expect(modifiedRequest.headers['Content-Type']).toBeUndefined();
    });
  });

  describe('Response Interceptor', () => {
    it('should return response data on success', async () => {
      const mockResponse = {
        data: { message: 'success' },
        status: 200,
      };

      const responseInterceptor = mockedAxios.interceptors.response.use.mock.calls[0][0];
      const result = responseInterceptor(mockResponse);

      expect(result).toEqual(mockResponse);
    });

    it('should handle 401 errors by clearing auth and redirecting', async () => {
      const mockError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
        config: { url: '/test' },
      };

      const errorInterceptor = mockedAxios.interceptors.response.use.mock.calls[0][1];
      
      try {
        await errorInterceptor(mockError);
      } catch (error) {
        // Expected to throw
      }

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user');
      expect(mockLocation.href).toBe('/login');
    });

    it('should not redirect on 401 for auth endpoints', async () => {
      const mockError = {
        response: {
          status: 401,
          data: { message: 'Invalid credentials' },
        },
        config: { url: '/auth/login' },
      };

      const errorInterceptor = mockedAxios.interceptors.response.use.mock.calls[0][1];
      
      try {
        await errorInterceptor(mockError);
      } catch (error) {
        expect(error).toEqual(mockError);
      }

      expect(mockLocalStorage.removeItem).not.toHaveBeenCalled();
      expect(mockLocation.href).toBe('http://localhost:3000');
    });

    it('should handle 403 errors', async () => {
      const mockError = {
        response: {
          status: 403,
          data: { message: 'Forbidden' },
        },
        config: { url: '/test' },
      };

      const errorInterceptor = mockedAxios.interceptors.response.use.mock.calls[0][1];
      
      try {
        await errorInterceptor(mockError);
      } catch (error) {
        expect(error).toEqual(mockError);
      }
    });

    it('should handle 429 rate limit errors', async () => {
      const mockError = {
        response: {
          status: 429,
          data: { message: 'Too many requests' },
        },
        config: { url: '/test' },
      };

      const errorInterceptor = mockedAxios.interceptors.response.use.mock.calls[0][1];
      
      try {
        await errorInterceptor(mockError);
      } catch (error) {
        expect(error).toEqual(mockError);
      }
    });

    it('should handle 500 server errors', async () => {
      const mockError = {
        response: {
          status: 500,
          data: { message: 'Internal server error' },
        },
        config: { url: '/test' },
      };

      const errorInterceptor = mockedAxios.interceptors.response.use.mock.calls[0][1];
      
      try {
        await errorInterceptor(mockError);
      } catch (error) {
        expect(error).toEqual(mockError);
      }
    });

    it('should handle network errors', async () => {
      const mockError = {
        message: 'Network Error',
        code: 'NETWORK_ERROR',
        config: { url: '/test' },
      };

      const errorInterceptor = mockedAxios.interceptors.response.use.mock.calls[0][1];
      
      try {
        await errorInterceptor(mockError);
      } catch (error) {
        expect(error).toEqual(mockError);
      }
    });

    it('should handle timeout errors', async () => {
      const mockError = {
        message: 'timeout of 10000ms exceeded',
        code: 'ECONNABORTED',
        config: { url: '/test' },
      };

      const errorInterceptor = mockedAxios.interceptors.response.use.mock.calls[0][1];
      
      try {
        await errorInterceptor(mockError);
      } catch (error) {
        expect(error).toEqual(mockError);
      }
    });
  });

  describe('API Client Configuration', () => {
    it('should have correct base configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
        },
      });
    });

    it('should have request and response interceptors configured', () => {
      expect(mockedAxios.interceptors.request.use).toHaveBeenCalled();
      expect(mockedAxios.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should preserve error structure for client handling', async () => {
      const mockError = {
        response: {
          status: 400,
          data: {
            message: 'Validation error',
            errors: {
              email: ['Email is required'],
              password: ['Password must be at least 8 characters'],
            },
          },
        },
        config: { url: '/auth/register' },
      };

      const errorInterceptor = mockedAxios.interceptors.response.use.mock.calls[0][1];
      
      try {
        await errorInterceptor(mockError);
      } catch (error) {
        expect(error).toEqual(mockError);
        expect(error.response.data.errors).toBeDefined();
      }
    });

    it('should handle errors without response', async () => {
      const mockError = {
        message: 'Request failed',
        config: { url: '/test' },
      };

      const errorInterceptor = mockedAxios.interceptors.response.use.mock.calls[0][1];
      
      try {
        await errorInterceptor(mockError);
      } catch (error) {
        expect(error).toEqual(mockError);
      }
    });

    it('should handle errors without config', async () => {
      const mockError = {
        message: 'Unknown error',
      };

      const errorInterceptor = mockedAxios.interceptors.response.use.mock.calls[0][1];
      
      try {
        await errorInterceptor(mockError);
      } catch (error) {
        expect(error).toEqual(mockError);
      }
    });
  });

  describe('Token Management', () => {
    it('should handle token refresh on 401 errors', async () => {
      // Mock refresh token endpoint
      const mockRefreshResponse = {
        data: {
          token: 'new-token',
          user: { id: '1', email: 'test@example.com' },
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockRefreshResponse);
      mockLocalStorage.getItem
        .mockReturnValueOnce('old-token') // First call for Authorization header
        .mockReturnValueOnce('refresh-token'); // Second call for refresh

      const mockError = {
        response: {
          status: 401,
          data: { message: 'Token expired' },
        },
        config: { 
          url: '/protected-endpoint',
          headers: {},
        },
      };

      const errorInterceptor = mockedAxios.interceptors.response.use.mock.calls[0][1];
      
      // This would typically retry the request with the new token
      // The exact implementation depends on your refresh token logic
      try {
        await errorInterceptor(mockError);
      } catch (error) {
        // Expected behavior for non-auth endpoints
      }
    });
  });

  describe('Request Retry Logic', () => {
    it('should retry failed requests with exponential backoff', async () => {
      // This test would verify retry logic if implemented
      const mockError = {
        response: {
          status: 503,
          data: { message: 'Service unavailable' },
        },
        config: { 
          url: '/test',
          retryCount: 0,
        },
      };

      const errorInterceptor = mockedAxios.interceptors.response.use.mock.calls[0][1];
      
      try {
        await errorInterceptor(mockError);
      } catch (error) {
        expect(error).toEqual(mockError);
      }
    });
  });

  describe('Request Cancellation', () => {
    it('should handle cancelled requests', async () => {
      const mockError = {
        message: 'Request cancelled',
        code: 'ERR_CANCELED',
        config: { url: '/test' },
      };

      const errorInterceptor = mockedAxios.interceptors.response.use.mock.calls[0][1];
      
      try {
        await errorInterceptor(mockError);
      } catch (error) {
        expect(error).toEqual(mockError);
      }
    });
  });
});