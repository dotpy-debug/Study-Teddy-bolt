import { createMocks } from 'node-mocks-http';
import handler from '@/app/api/auth/login/route';

// Mock the backend API client
jest.mock('@/lib/api-client', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

import { apiClient } from '@/lib/api-client';
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('/api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle successful login', async () => {
    const mockLoginResponse = {
      data: {
        token: 'mock-token',
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          authProvider: 'local',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      },
    };

    mockApiClient.post.mockResolvedValue(mockLoginResponse);

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'password123',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual(mockLoginResponse.data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/auth/login', {
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('should handle login validation errors', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'invalid-email',
        password: '',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const responseData = JSON.parse(res._getData());
    expect(responseData.message).toContain('validation');
  });

  it('should handle backend authentication errors', async () => {
    const mockError = {
      response: {
        status: 401,
        data: {
          message: 'Invalid credentials',
        },
      },
    };

    mockApiClient.post.mockRejectedValue(mockError);

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'wrongpassword',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
    expect(JSON.parse(res._getData())).toEqual({
      message: 'Invalid credentials',
    });
  });

  it('should handle backend server errors', async () => {
    const mockError = {
      response: {
        status: 500,
        data: {
          message: 'Internal server error',
        },
      },
    };

    mockApiClient.post.mockRejectedValue(mockError);

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'password123',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toEqual({
      message: 'Internal server error',
    });
  });

  it('should handle network errors', async () => {
    const networkError = new Error('Network Error');
    mockApiClient.post.mockRejectedValue(networkError);

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'password123',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toEqual({
      message: 'An error occurred during login',
    });
  });

  it('should reject non-POST requests', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toEqual({
      message: 'Method not allowed',
    });
  });

  it('should handle missing request body', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: null,
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      message: 'Request body is required',
    });
  });

  it('should validate email format', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'not-an-email',
        password: 'password123',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const responseData = JSON.parse(res._getData());
    expect(responseData.message).toContain('email');
  });

  it('should validate password presence', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: '',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const responseData = JSON.parse(res._getData());
    expect(responseData.message).toContain('password');
  });

  it('should handle rate limiting', async () => {
    const mockError = {
      response: {
        status: 429,
        data: {
          message: 'Too many requests',
        },
      },
    };

    mockApiClient.post.mockRejectedValue(mockError);

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'password123',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(429);
    expect(JSON.parse(res._getData())).toEqual({
      message: 'Too many requests',
    });
  });

  it('should sanitize user input', async () => {
    const mockLoginResponse = {
      data: {
        token: 'mock-token',
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          authProvider: 'local',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      },
    };

    mockApiClient.post.mockResolvedValue(mockLoginResponse);

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: '  TEST@EXAMPLE.COM  ',
        password: 'password123',
        extraField: 'should be ignored',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(mockApiClient.post).toHaveBeenCalledWith('/auth/login', {
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('should handle malformed JSON', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
    });

    // Simulate malformed JSON by setting raw body
    req.body = 'invalid json';

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      message: 'Invalid JSON in request body',
    });
  });
});