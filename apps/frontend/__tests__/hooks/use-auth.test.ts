import { renderHook, act, waitFor } from '@testing-library/react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAuth, useRequireAuth, useRedirectIfAuthenticated } from '@/hooks/use-auth';
import { authApi } from '@/lib/api/auth';

// Mock dependencies
jest.mock('next-auth/react');
jest.mock('next/navigation');
jest.mock('@/lib/api/auth');

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockAuthApi = authApi as jest.Mocked<typeof authApi>;

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  pathname: '/',
};

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter );
    
    // Clear localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });
  });

  describe('with NextAuth session', () => {
    it('should return user data from NextAuth session', async () => {
      const mockSession = {
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          image: 'https://example.com/avatar.jpg',
        },
        expires: '2024-12-31',
      };

      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual({
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        authProvider: 'google',
        createdAt: '',
        updatedAt: '',
      });
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.session).toEqual(mockSession);
    });
  });

  describe('with local storage auth', () => {
    it('should return user data from localStorage', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        authProvider: 'local' as const,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      (localStorage.getItem as jest.Mock)
        .mockReturnValueOnce('mock-token')
        .mockReturnValueOnce(JSON.stringify(mockUser));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle corrupted localStorage data', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      (localStorage.getItem as jest.Mock)
        .mockReturnValueOnce('mock-token')
        .mockReturnValueOnce('invalid-json');

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
    });
  });

  describe('login', () => {
    it('should login successfully and store user data', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      const mockLoginResponse = {
        token: 'mock-token',
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          authProvider: 'local' as const,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      };

      mockAuthApi.login.mockResolvedValue(mockLoginResponse);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const response = await result.current.login({
          email: 'test@example.com',
          password: 'password123',
        });
        expect(response).toEqual(mockLoginResponse);
      });

      expect(localStorage.setItem).toHaveBeenCalledWith('token', 'mock-token');
      expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockLoginResponse.user));
      expect(result.current.user).toEqual(mockLoginResponse.user);
    });

    it('should handle login errors', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      const mockError = new Error('Invalid credentials');
      mockAuthApi.login.mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await expect(
          result.current.login({
            email: 'test@example.com',
            password: 'wrongpassword',
          })
        ).rejects.toThrow('Invalid credentials');
      });

      expect(result.current.user).toBeNull();
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('should register successfully and store user data', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      const mockRegisterResponse = {
        token: 'mock-token',
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          authProvider: 'local' as const,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      };

      mockAuthApi.register.mockResolvedValue(mockRegisterResponse);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const response = await result.current.register({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        });
        expect(response).toEqual(mockRegisterResponse);
      });

      expect(localStorage.setItem).toHaveBeenCalledWith('token', 'mock-token');
      expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockRegisterResponse.user));
      expect(result.current.user).toEqual(mockRegisterResponse.user);
    });
  });

  describe('logout', () => {
    it('should logout from NextAuth session', async () => {
      const mockSession = {
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        expires: '2024-12-31',
      };

      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(mockSignOut).toHaveBeenCalledWith({ redirect: false });
      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
      expect(result.current.user).toBeNull();
    });

    it('should logout from custom auth', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        authProvider: 'local' as const,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      (localStorage.getItem as jest.Mock)
        .mockReturnValueOnce('mock-token')
        .mockReturnValueOnce(JSON.stringify(mockUser));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(mockAuthApi.logout).toHaveBeenCalled();
      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
      expect(result.current.user).toBeNull();
    });
  });

  describe('googleSignIn', () => {
    it('should sign in with Google', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      const mockSignInResult = { ok: true, error: null };
      mockSignIn.mockResolvedValue(mockSignInResult);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const response = await result.current.googleSignIn('/custom-callback');
        expect(response).toEqual(mockSignInResult);
      });

      expect(mockSignIn).toHaveBeenCalledWith('google', {
        callbackUrl: '/custom-callback',
      });
    });
  });
});

describe('useRequireAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter );
  });

  it('should redirect unauthenticated users to login', async () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    (localStorage.getItem as jest.Mock).mockReturnValue(null);

    renderHook(() => useRequireAuth('/protected-page'));

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/login?callbackUrl=%2Fprotected-page');
    });
  });

  it('should not redirect authenticated users', async () => {
    const mockSession = {
      user: { id: '1', name: 'Test User', email: 'test@example.com' },
      expires: '2024-12-31',
    };

    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    });

    const { result } = renderHook(() => useRequireAuth('/protected-page'));

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});

describe('useRedirectIfAuthenticated', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter );
  });

  it('should redirect authenticated users away from auth pages', async () => {
    const mockSession = {
      user: { id: '1', name: 'Test User', email: 'test@example.com' },
      expires: '2024-12-31',
    };

    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    });

    renderHook(() => useRedirectIfAuthenticated('/dashboard'));

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should not redirect unauthenticated users', async () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    (localStorage.getItem as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => useRedirectIfAuthenticated('/dashboard'));

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false);
    });

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});