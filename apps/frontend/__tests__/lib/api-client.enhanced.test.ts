import { ApiClient } from '@/lib/api-client';
import { ApiError, NetworkError, AuthenticationError, ValidationError, isRetryableError, getRetryDelay } from '@/lib/errors';
import { faker } from '@faker-js/faker';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock the errors module
jest.mock('@/lib/errors', () => ({
  ApiError: jest.fn(),
  NetworkError: jest.fn(),
  AuthenticationError: jest.fn(),
  AuthorizationError: jest.fn(),
  ValidationError: jest.fn(),
  RateLimitError: jest.fn(),
  isRetryableError: jest.fn(),
  getRetryDelay: jest.fn(),
  ErrorParser: {
    parse: jest.fn(),
  },
  ErrorReporter: {
    report: jest.fn(),
  },
}));

describe('ApiClient', () => {
  let apiClient: ApiClient;
  const baseURL = 'https://api.studyteddy.com';

  beforeEach(() => {
    jest.clearAllMocks();
    apiClient = new ApiClient({
      baseURL,
      timeout: 5000,
      retries: 3,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Version': '1.0.0',
      },
    });
  });

  describe('Constructor', () => {
    it('should initialize with default configuration', () => {
      const defaultClient = new ApiClient();
      expect(defaultClient).toBeInstanceOf(ApiClient);
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        baseURL: 'https://custom.api.com',
        timeout: 10000,
        retries: 5,
        headers: { 'Custom-Header': 'value' },
      };

      const customClient = new ApiClient(customConfig);
      expect(customClient).toBeInstanceOf(ApiClient);
    });
  });

  describe('HTTP Methods', () => {
    const mockResponseData = {
      data: { id: faker.string.uuid(), name: faker.person.fullName() },
      success: true,
      message: 'Success',
      timestamp: new Date().toISOString(),
    };

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'content-type': 'application/json',
        }),
        json: jest.fn().mockResolvedValue(mockResponseData),
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponseData)),
      });
    });

    describe('GET requests', () => {
      it('should make successful GET request', async () => {
        const endpoint = '/users/123';
        const result = await apiClient.get(endpoint);

        expect(mockFetch).toHaveBeenCalledWith(
          `${baseURL}${endpoint}`,
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'X-Client-Version': '1.0.0',
            }),
          })
        );

        expect(result).toEqual(mockResponseData);
      });

      it('should handle query parameters', async () => {
        const endpoint = '/users';
        const params = { page: 1, limit: 10, search: 'john' };

        await apiClient.get(endpoint, { params });

        const expectedUrl = `${baseURL}${endpoint}?page=1&limit=10&search=john`;
        expect(mockFetch).toHaveBeenCalledWith(
          expectedUrl,
          expect.any(Object)
        );
      });

      it('should handle custom headers', async () => {
        const endpoint = '/protected';
        const customHeaders = { Authorization: 'Bearer token123' };

        await apiClient.get(endpoint, { headers: customHeaders });

        expect(mockFetch).toHaveBeenCalledWith(
          `${baseURL}${endpoint}`,
          expect.objectContaining({
            headers: expect.objectContaining({
              ...customHeaders,
              'Content-Type': 'application/json',
            }),
          })
        );
      });
    });

    describe('POST requests', () => {
      it('should make successful POST request', async () => {
        const endpoint = '/users';
        const data = {
          name: faker.person.fullName(),
          email: faker.internet.email(),
        };

        const result = await apiClient.post(endpoint, data);

        expect(mockFetch).toHaveBeenCalledWith(
          `${baseURL}${endpoint}`,
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
            body: JSON.stringify(data),
          })
        );

        expect(result).toEqual(mockResponseData);
      });

      it('should handle FormData', async () => {
        const endpoint = '/upload';
        const formData = new FormData();
        formData.append('file', new File(['content'], 'test.txt'));

        await apiClient.post(endpoint, formData);

        expect(mockFetch).toHaveBeenCalledWith(
          `${baseURL}${endpoint}`,
          expect.objectContaining({
            method: 'POST',
            body: formData,
            // Content-Type should not be set for FormData
            headers: expect.not.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        );
      });
    });

    describe('PUT requests', () => {
      it('should make successful PUT request', async () => {
        const endpoint = '/users/123';
        const data = { name: 'Updated Name' };

        const result = await apiClient.put(endpoint, data);

        expect(mockFetch).toHaveBeenCalledWith(
          `${baseURL}${endpoint}`,
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify(data),
          })
        );

        expect(result).toEqual(mockResponseData);
      });
    });

    describe('DELETE requests', () => {
      it('should make successful DELETE request', async () => {
        const endpoint = '/users/123';

        const result = await apiClient.delete(endpoint);

        expect(mockFetch).toHaveBeenCalledWith(
          `${baseURL}${endpoint}`,
          expect.objectContaining({
            method: 'DELETE',
          })
        );

        expect(result).toEqual(mockResponseData);
      });
    });

    describe('PATCH requests', () => {
      it('should make successful PATCH request', async () => {
        const endpoint = '/users/123';
        const data = { status: 'active' };

        const result = await apiClient.patch(endpoint, data);

        expect(mockFetch).toHaveBeenCalledWith(
          `${baseURL}${endpoint}`,
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify(data),
          })
        );

        expect(result).toEqual(mockResponseData);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      mockFetch.mockRejectedValue(networkError);

      await expect(apiClient.get('/test')).rejects.toThrow(NetworkError);
    });

    it('should handle HTTP 401 errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers(),
        json: jest.fn().mockResolvedValue({
          error: 'Invalid token',
          message: 'Authentication failed',
        }),
      });

      await expect(apiClient.get('/protected')).rejects.toThrow(AuthenticationError);
    });

    it('should handle HTTP 400 validation errors', async () => {
      const validationErrors = {
        errors: {
          email: ['Email is required'],
          password: ['Password too short'],
        },
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers(),
        json: jest.fn().mockResolvedValue(validationErrors),
      });

      await expect(apiClient.post('/register', {})).rejects.toThrow(ValidationError);
    });

    it('should handle HTTP 500 server errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers(),
        json: jest.fn().mockResolvedValue({
          error: 'Internal server error',
        }),
      });

      await expect(apiClient.get('/test')).rejects.toThrow(ApiError);
    });

    it('should handle timeout errors', async () => {
      // Mock a timeout scenario
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      mockFetch.mockRejectedValue(timeoutError);

      await expect(
        apiClient.get('/slow-endpoint', { timeout: 1000 })
      ).rejects.toThrow();
    });
  });

  describe('Retry Logic', () => {
    it('should retry on retryable errors', async () => {
      (isRetryableError as jest.Mock).mockReturnValue(true);
      (getRetryDelay as jest.Mock).mockReturnValue(100); // Short delay for tests

      // First two calls fail, third succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: jest.fn().mockResolvedValue({ data: 'success' }),
        });

      const result = await apiClient.get('/retry-test', { retries: 2 });

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ data: 'success' });
    });

    it('should not retry on non-retryable errors', async () => {
      // Using imported isRetryableError
      (isRetryableError as jest.Mock).mockReturnValue(false);

      mockFetch.mockRejectedValue(new Error('Non-retryable error'));

      await expect(apiClient.get('/no-retry-test')).rejects.toThrow();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should respect maximum retry attempts', async () => {
      // Using imported isRetryableError and getRetryDelay
      (isRetryableError as jest.Mock).mockReturnValue(true);
      (getRetryDelay as jest.Mock).mockReturnValue(10);

      mockFetch.mockRejectedValue(new Error('Always fails'));

      await expect(
        apiClient.get('/always-fails', { retries: 2 })
      ).rejects.toThrow();

      expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('Request Cancellation', () => {
    it('should support request cancellation with AbortController', async () => {
      const abortController = new AbortController();

      // Mock a long-running request
      const longRunningPromise = new Promise((resolve) => {
        setTimeout(() => resolve({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: () => Promise.resolve({ data: 'result' }),
        }), 1000);
      });

      mockFetch.mockImplementation((url, config) => {
        // Simulate abort signal handling
        if (config?.signal?.aborted) {
          return Promise.reject(new Error('Request aborted'));
        }
        return longRunningPromise;
      });

      const requestPromise = apiClient.get('/long-request', {
        signal: abortController.signal,
      });

      // Cancel the request immediately
      abortController.abort();

      await expect(requestPromise).rejects.toThrow();
    });
  });

  describe('Response Processing', () => {
    it('should handle JSON responses', async () => {
      const jsonData = { message: 'Success', data: { id: 1 } };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue(jsonData),
      });

      const result = await apiClient.get('/json-endpoint');

      expect(result).toEqual(jsonData);
    });

    it('should handle text responses', async () => {
      const textData = 'Plain text response';

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: jest.fn().mockResolvedValue(textData),
        json: jest.fn().mockRejectedValue(new Error('Not JSON')),
      });

      const result = await apiClient.get('/text-endpoint');

      expect(result).toBe(textData);
    });

    it('should handle empty responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        headers: new Headers(),
        text: jest.fn().mockResolvedValue(''),
        json: jest.fn().mockRejectedValue(new Error('No content')),
      });

      const result = await apiClient.delete('/item/123');

      expect(result).toBe('');
    });
  });

  describe('Authentication Integration', () => {
    it('should include auth token in requests', async () => {
      const token = 'bearer-token-123';
      apiClient.setAuthToken(token);

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({ data: 'authenticated' }),
      });

      await apiClient.get('/protected');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${token}`,
          }),
        })
      );
    });

    it('should clear auth token', async () => {
      apiClient.setAuthToken('token');
      apiClient.clearAuthToken();

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({ data: 'public' }),
      });

      await apiClient.get('/public');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.any(String),
          }),
        })
      );
    });
  });

  describe('Request Interceptors', () => {
    it('should apply request interceptors', async () => {
      const interceptor = jest.fn((config) => ({
        ...config,
        headers: {
          ...config.headers,
          'X-Custom-Header': 'intercepted',
        },
      }));

      apiClient.addRequestInterceptor(interceptor);

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({ data: 'success' }),
      });

      await apiClient.get('/test');

      expect(interceptor).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'intercepted',
          }),
        })
      );
    });
  });

  describe('Response Interceptors', () => {
    it('should apply response interceptors', async () => {
      const responseData = { data: 'original' };
      const interceptor = jest.fn((response) => ({
        ...response,
        data: { ...response.data, intercepted: true },
      }));

      apiClient.addResponseInterceptor(interceptor);

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue(responseData),
      });

      const result = await apiClient.get('/test');

      expect(interceptor).toHaveBeenCalled();
      expect(result).toEqual({
        data: 'original',
        intercepted: true,
      });
    });
  });
});