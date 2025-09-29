import axios from 'axios';
import { authApi } from '@/lib/api/auth';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('authApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully', async () => {
      const mockResponse = {
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

      mockedAxios.post.mockResolvedValue(mockResponse);

      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = await authApi.login(credentials);

      expect(mockedAxios.post).toHaveBeenCalledWith('/auth/login', credentials);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle login errors', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            message: 'Invalid credentials',
          },
        },
      };

      mockedAxios.post.mockRejectedValue(mockError);

      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      await expect(authApi.login(credentials)).rejects.toEqual(mockError);
      expect(mockedAxios.post).toHaveBeenCalledWith('/auth/login', credentials);
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockedAxios.post.mockRejectedValue(networkError);

      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      await expect(authApi.login(credentials)).rejects.toThrow('Network Error');
    });
  });

  describe('register', () => {
    it('should register successfully', async () => {
      const mockResponse = {
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

      mockedAxios.post.mockResolvedValue(mockResponse);

      const credentials = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      const result = await authApi.register(credentials);

      expect(mockedAxios.post).toHaveBeenCalledWith('/auth/register', credentials);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle registration errors', async () => {
      const mockError = {
        response: {
          status: 409,
          data: {
            message: 'User already exists',
          },
        },
      };

      mockedAxios.post.mockRejectedValue(mockError);

      const credentials = {
        name: 'Test User',
        email: 'existing@example.com',
        password: 'password123',
      };

      await expect(authApi.register(credentials)).rejects.toEqual(mockError);
      expect(mockedAxios.post).toHaveBeenCalledWith('/auth/register', credentials);
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const mockResponse = {
        data: {
          message: 'Logged out successfully',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await authApi.logout();

      expect(mockedAxios.post).toHaveBeenCalledWith('/auth/logout');
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle logout errors gracefully', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            message: 'Not authenticated',
          },
        },
      };

      mockedAxios.post.mockRejectedValue(mockError);

      await expect(authApi.logout()).rejects.toEqual(mockError);
    });
  });

  describe('getProfile', () => {
    it('should get user profile successfully', async () => {
      const mockResponse = {
        data: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          authProvider: 'local',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await authApi.getProfile();

      expect(mockedAxios.get).toHaveBeenCalledWith('/auth/me');
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle unauthorized access', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            message: 'Unauthorized',
          },
        },
      };

      mockedAxios.get.mockRejectedValue(mockError);

      await expect(authApi.getProfile()).rejects.toEqual(mockError);
    });
  });

  describe('forgotPassword', () => {
    it('should send forgot password request successfully', async () => {
      const mockResponse = {
        data: {
          message: 'Password reset email sent',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const email = 'test@example.com';
      const result = await authApi.forgotPassword(email);

      expect(mockedAxios.post).toHaveBeenCalledWith('/auth/forgot-password', { email });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle forgot password errors', async () => {
      const mockError = {
        response: {
          status: 400,
          data: {
            message: 'Invalid email format',
          },
        },
      };

      mockedAxios.post.mockRejectedValue(mockError);

      const email = 'invalid-email';

      await expect(authApi.forgotPassword(email)).rejects.toEqual(mockError);
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const mockResponse = {
        data: {
          message: 'Password reset successfully',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const resetData = {
        token: 'reset-token',
        password: 'newpassword123',
      };

      const result = await authApi.resetPassword(resetData);

      expect(mockedAxios.post).toHaveBeenCalledWith('/auth/reset-password', resetData);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle invalid reset token', async () => {
      const mockError = {
        response: {
          status: 400,
          data: {
            message: 'Invalid or expired reset token',
          },
        },
      };

      mockedAxios.post.mockRejectedValue(mockError);

      const resetData = {
        token: 'invalid-token',
        password: 'newpassword123',
      };

      await expect(authApi.resetPassword(resetData)).rejects.toEqual(mockError);
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const mockResponse = {
        data: {
          id: '1',
          email: 'test@example.com',
          name: 'Updated Name',
          authProvider: 'local',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-02',
        },
      };

      mockedAxios.put.mockResolvedValue(mockResponse);

      const updateData = {
        name: 'Updated Name',
      };

      const result = await authApi.updateProfile(updateData);

      expect(mockedAxios.put).toHaveBeenCalledWith('/auth/profile', updateData);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle profile update errors', async () => {
      const mockError = {
        response: {
          status: 400,
          data: {
            message: 'Invalid profile data',
          },
        },
      };

      mockedAxios.put.mockRejectedValue(mockError);

      const updateData = {
        name: '',
      };

      await expect(authApi.updateProfile(updateData)).rejects.toEqual(mockError);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const mockResponse = {
        data: {
          message: 'Password changed successfully',
        },
      };

      mockedAxios.put.mockResolvedValue(mockResponse);

      const passwordData = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
      };

      const result = await authApi.changePassword(passwordData);

      expect(mockedAxios.put).toHaveBeenCalledWith('/auth/change-password', passwordData);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle incorrect current password', async () => {
      const mockError = {
        response: {
          status: 400,
          data: {
            message: 'Current password is incorrect',
          },
        },
      };

      mockedAxios.put.mockRejectedValue(mockError);

      const passwordData = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123',
      };

      await expect(authApi.changePassword(passwordData)).rejects.toEqual(mockError);
    });
  });

  describe('deleteAccount', () => {
    it('should delete account successfully', async () => {
      const mockResponse = {
        data: {
          message: 'Account deleted successfully',
        },
      };

      mockedAxios.delete.mockResolvedValue(mockResponse);

      const result = await authApi.deleteAccount();

      expect(mockedAxios.delete).toHaveBeenCalledWith('/auth/account');
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle account deletion errors', async () => {
      const mockError = {
        response: {
          status: 403,
          data: {
            message: 'Cannot delete account',
          },
        },
      };

      mockedAxios.delete.mockRejectedValue(mockError);

      await expect(authApi.deleteAccount()).rejects.toEqual(mockError);
    });
  });
});