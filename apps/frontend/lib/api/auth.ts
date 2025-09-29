import { apiClient, type ApiError } from './client';
import type {
  LoginDto,
  RegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  GoogleAuthDto,
  User,
  UserProfile
} from '@studyteddy/shared';

// Backend auth response format (snake_case)
interface BackendAuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

// Auth state interface
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Auth result interface
export interface AuthResult<T = unknown> {
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
}

// Google OAuth configuration
export interface GoogleOAuthConfig {
  clientId: string;
  redirectUri: string;
  scope: string;
}

export const authApi = {
  // Register with email and password
  register: async (credentials: RegisterDto): Promise<AuthResult<BackendAuthResponse>> => {
    try {
      const response = await apiClient.post<BackendAuthResponse>('/auth/register', credentials);

      // Store user data locally (Better Auth manages session cookies)
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(response.user));
      }

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Login with email and password
  login: async (credentials: LoginDto): Promise<AuthResult<BackendAuthResponse>> => {
    try {
      const response = await apiClient.post<BackendAuthResponse>('/auth/login', credentials);

      // Store user data
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(response.user));
      }

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Get current user profile
  me: async (): Promise<AuthResult<UserProfile>> => {
    try {
      const response = await apiClient.get<UserProfile>('/auth/me');

      // Update stored user data
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(response));
      }

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Logout
  logout: async (): Promise<AuthResult<void>> => {
    try {
      // Call logout endpoint to invalidate server-side session
      await apiClient.post('/auth/logout');

      // Clear stored user info
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
      }

      return {
        data: null,
        error: null,
        isLoading: false
      };
    } catch (error) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
      }

      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Refresh JWT token
  refreshToken: async (): Promise<AuthResult<{ accessToken: string; refreshToken: string }>> => {
    try {
      // No-op with Better Auth session; backend token is exchanged per request
      const response = { access_token: '', refresh_token: '' };

      return {
        data: { accessToken: response.access_token, refreshToken: response.refresh_token },
        error: null,
        isLoading: false
      };
    } catch (error) {
      // No-op
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Forgot password
  forgotPassword: async (data: ForgotPasswordDto): Promise<AuthResult<{ message: string }>> => {
    try {
      const response = await apiClient.post<{ message: string }>('/auth/forgot-password', data);

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Reset password
  resetPassword: async (data: ResetPasswordDto): Promise<AuthResult<{ message: string }>> => {
    try {
      const response = await apiClient.post<{ message: string }>('/auth/reset-password', data);

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Change password
  changePassword: async (data: ChangePasswordDto): Promise<AuthResult<{ message: string }>> => {
    try {
      const response = await apiClient.post<{ message: string }>('/auth/change-password', data);

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Google OAuth initialization
  getGoogleAuthUrl: (config: GoogleOAuthConfig): string => {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scope,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  },

  // Google OAuth callback handler
  googleCallback: async (code: string): Promise<AuthResult<BackendAuthResponse>> => {
    try {
      const response = await apiClient.post<BackendAuthResponse>('/auth/google/callback', { code });

      // Store user data
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(response.user));
      }

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Google OAuth registration/login
  googleAuth: async (googleData: GoogleAuthDto): Promise<AuthResult<BackendAuthResponse>> => {
    try {
      const response = await apiClient.post<BackendAuthResponse>('/auth/google', googleData);

      // Store user data
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(response.user));
      }

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    // With Better Auth, rely on presence of stored user as heuristic (SSR uses middleware)
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('user');
  },

  // Get stored user data
  getStoredUser: (): User | null => {
    if (typeof window === 'undefined') return null;

    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  },

  // Clear all auth data
  clearAuth: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
    }
  }
};