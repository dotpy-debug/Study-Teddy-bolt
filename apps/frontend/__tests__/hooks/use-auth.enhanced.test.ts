import { renderHook, act, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useAuth, useRequireAuth, useRedirectIfAuthenticated } from '@/hooks/use-auth';
import { authClient } from '@/lib/auth-client';
import { faker } from '@faker-js/faker';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/lib/auth-client', () => ({
  authClient: {
    useSession: jest.fn(),
    signIn: {
      email: jest.fn(),
      social: jest.fn(),
    },
    signUp: {
      email: jest.fn(),
    },
    signOut: jest.fn(),
    emailOtp: {
      sendOtp: jest.fn(),
      verifyOtp: jest.fn(),
    },
  },
}));

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
};

const mockAuthClient = authClient as jest.Mocked<typeof authClient>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

// Test helpers
const createMockUser = () => ({
  id: faker.string.uuid(),
  name: faker.person.fullName(),
  email: faker.internet.email(),
  image: faker.image.avatar(),
});

const createMockSession = (user = createMockUser()) => ({
  user,
  expires: faker.date.future().toISOString(),
});

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter);
  });

  describe('Authentication State', () => {
    it('should return unauthenticated state when no session', () => {
      mockAuthClient.useSession.mockReturnValue({
        data: null,
        isPending: false,
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isUnauthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('should return authenticated state when session exists', () => {
      const mockUser = createMockUser();
      const mockSession = createMockSession(mockUser);

      mockAuthClient.useSession.mockReturnValue({
        data: mockSession,
        isPending: false,
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        image: mockUser.image,
      });
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isUnauthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('should return loading state when session is pending', () => {
      mockAuthClient.useSession.mockReturnValue({
        data: null,
        isPending: true,
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.loading).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isUnauthenticated).toBe(false);
    });

    it('should handle user with missing optional fields', () => {
      const mockSession = {
        user: {
          id: faker.string.uuid(),
          email: faker.internet.email(),
          // name and image are missing
        },
        expires: faker.date.future().toISOString(),
      };

      mockAuthClient.useSession.mockReturnValue({
        data: mockSession,
        isPending: false,
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toEqual({
        id: mockSession.user.id,
        email: mockSession.user.email,
        name: undefined,
        image: undefined,
      });
    });
  });

  describe('Login', () => {
    beforeEach(() => {
      mockAuthClient.useSession.mockReturnValue({
        data: null,
        isPending: false,
      });
    });

    it('should login successfully with valid credentials', async () => {
      const credentials = {
        email: faker.internet.email(),
        password: faker.internet.password(),
      };

      mockAuthClient.signIn.email.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const response = await result.current.login(credentials);
        expect(response).toEqual({ success: true });
      });

      expect(mockAuthClient.signIn.email).toHaveBeenCalledWith({
        email: credentials.email,
        password: credentials.password,
      });
    });

    it('should throw error when login fails', async () => {
      const credentials = {
        email: faker.internet.email(),
        password: faker.internet.password(),
      };

      const errorMessage = 'Invalid credentials';
      mockAuthClient.signIn.email.mockResolvedValue({
        error: { message: errorMessage },
      });

      const { result } = renderHook(() => useAuth());

      await expect(result.current.login(credentials)).rejects.toThrow(errorMessage);
    });

    it('should throw generic error when no error message provided', async () => {
      const credentials = {
        email: faker.internet.email(),
        password: faker.internet.password(),
      };

      mockAuthClient.signIn.email.mockResolvedValue({
        error: {},
      });

      const { result } = renderHook(() => useAuth());

      await expect(result.current.login(credentials)).rejects.toThrow('Login failed');
    });
  });

  describe('Registration', () => {
    beforeEach(() => {
      mockAuthClient.useSession.mockReturnValue({
        data: null,
        isPending: false,
      });
    });

    it('should register successfully with valid credentials', async () => {
      const credentials = {
        email: faker.internet.email(),
        password: faker.internet.password(),
        name: faker.person.fullName(),
      };

      mockAuthClient.signUp.email.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const response = await result.current.register(credentials);
        expect(response).toEqual({ success: true });
      });

      expect(mockAuthClient.signUp.email).toHaveBeenCalledWith({
        email: credentials.email,
        password: credentials.password,
        name: credentials.name,
      });
    });

    it('should register without name', async () => {
      const credentials = {
        email: faker.internet.email(),
        password: faker.internet.password(),
      };

      mockAuthClient.signUp.email.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.register(credentials);
      });

      expect(mockAuthClient.signUp.email).toHaveBeenCalledWith({
        email: credentials.email,
        password: credentials.password,
        name: undefined,
      });
    });

    it('should throw error when registration fails', async () => {
      const credentials = {
        email: faker.internet.email(),
        password: faker.internet.password(),
      };

      const errorMessage = 'Email already exists';
      mockAuthClient.signUp.email.mockResolvedValue({
        error: { message: errorMessage },
      });

      const { result } = renderHook(() => useAuth());

      await expect(result.current.register(credentials)).rejects.toThrow(errorMessage);
    });
  });

  describe('Logout', () => {
    it('should logout and redirect to login page', async () => {
      mockAuthClient.useSession.mockReturnValue({
        data: createMockSession(),
        isPending: false,
      });

      mockAuthClient.signOut.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(mockAuthClient.signOut).toHaveBeenCalled();
      expect(mockRouter.push).toHaveBeenCalledWith('/login');
    });
  });

  describe('Social Sign In', () => {
    beforeEach(() => {
      mockAuthClient.useSession.mockReturnValue({
        data: null,
        isPending: false,
      });
    });

    it('should sign in with Google', async () => {
      const callbackUrl = '/custom-dashboard';
      mockAuthClient.signIn.social.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.googleSignIn(callbackUrl);
      });

      expect(mockAuthClient.signIn.social).toHaveBeenCalledWith({
        provider: 'google',
        callbackURL: callbackUrl,
      });
    });

    it('should sign in with GitHub with default callback', async () => {
      mockAuthClient.signIn.social.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.githubSignIn();
      });

      expect(mockAuthClient.signIn.social).toHaveBeenCalledWith({
        provider: 'github',
        callbackURL: '/dashboard',
      });
    });

    it('should sign in with Microsoft', async () => {
      const callbackUrl = '/profile';
      mockAuthClient.signIn.social.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.microsoftSignIn(callbackUrl);
      });

      expect(mockAuthClient.signIn.social).toHaveBeenCalledWith({
        provider: 'microsoft',
        callbackURL: callbackUrl,
      });
    });
  });

  describe('Email OTP', () => {
    beforeEach(() => {
      mockAuthClient.useSession.mockReturnValue({
        data: null,
        isPending: false,
      });
    });

    it('should send OTP successfully', async () => {
      const email = faker.internet.email();
      mockAuthClient.emailOtp.sendOtp.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const response = await result.current.sendEmailOTP(email);
        expect(response).toEqual({ success: true });
      });

      expect(mockAuthClient.emailOtp.sendOtp).toHaveBeenCalledWith({ email });
    });

    it('should throw error when sending OTP fails', async () => {
      const email = faker.internet.email();
      const errorMessage = 'Failed to send email';
      mockAuthClient.emailOtp.sendOtp.mockResolvedValue({
        error: { message: errorMessage },
      });

      const { result } = renderHook(() => useAuth());

      await expect(result.current.sendEmailOTP(email)).rejects.toThrow(errorMessage);
    });

    it('should verify OTP successfully', async () => {
      const email = faker.internet.email();
      const otp = faker.number.int({ min: 100000, max: 999999 }).toString();
      mockAuthClient.emailOtp.verifyOtp.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const response = await result.current.verifyEmailOTP(email, otp);
        expect(response).toEqual({ success: true });
      });

      expect(mockAuthClient.emailOtp.verifyOtp).toHaveBeenCalledWith({ email, otp });
    });

    it('should throw error when OTP verification fails', async () => {
      const email = faker.internet.email();
      const otp = '123456';
      const errorMessage = 'Invalid OTP';
      mockAuthClient.emailOtp.verifyOtp.mockResolvedValue({
        error: { message: errorMessage },
      });

      const { result } = renderHook(() => useAuth());

      await expect(result.current.verifyEmailOTP(email, otp)).rejects.toThrow(errorMessage);
    });
  });

  describe('Session Update', () => {
    it('should update session (compatibility method)', async () => {
      mockAuthClient.useSession.mockReturnValue({
        data: createMockSession(),
        isPending: false,
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.updateSession({ name: 'Updated Name' });
      });

      // Should not throw error (compatibility method)
      expect(true).toBe(true);
    });
  });
});

describe('useRequireAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter);
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { pathname: '/protected-page' },
      writable: true,
    });
  });

  it('should not redirect when user is authenticated', () => {
    mockAuthClient.useSession.mockReturnValue({
      data: createMockSession(),
      isPending: false,
    });

    const { result } = renderHook(() => useRequireAuth());

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('should redirect to login when user is not authenticated', async () => {
    mockAuthClient.useSession.mockReturnValue({
      data: null,
      isPending: false,
    });

    renderHook(() => useRequireAuth());

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith(
        '/login?callbackUrl=%2Fprotected-page'
      );
    });
  });

  it('should redirect to custom redirect URL', async () => {
    mockAuthClient.useSession.mockReturnValue({
      data: null,
      isPending: false,
    });

    const customRedirect = '/custom-page';
    renderHook(() => useRequireAuth(customRedirect));

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith(
        `/login?callbackUrl=${encodeURIComponent(customRedirect)}`
      );
    });
  });

  it('should not redirect when loading', () => {
    mockAuthClient.useSession.mockReturnValue({
      data: null,
      isPending: true,
    });

    renderHook(() => useRequireAuth());

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});

describe('useRedirectIfAuthenticated', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter);
  });

  it('should redirect to dashboard when user is authenticated', async () => {
    mockAuthClient.useSession.mockReturnValue({
      data: createMockSession(),
      isPending: false,
    });

    renderHook(() => useRedirectIfAuthenticated());

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should redirect to custom URL when provided', async () => {
    mockAuthClient.useSession.mockReturnValue({
      data: createMockSession(),
      isPending: false,
    });

    const customRedirect = '/profile';
    renderHook(() => useRedirectIfAuthenticated(customRedirect));

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith(customRedirect);
    });
  });

  it('should not redirect when user is not authenticated', () => {
    mockAuthClient.useSession.mockReturnValue({
      data: null,
      isPending: false,
    });

    renderHook(() => useRedirectIfAuthenticated());

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('should not redirect when loading', () => {
    mockAuthClient.useSession.mockReturnValue({
      data: createMockSession(),
      isPending: true,
    });

    renderHook(() => useRedirectIfAuthenticated());

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});