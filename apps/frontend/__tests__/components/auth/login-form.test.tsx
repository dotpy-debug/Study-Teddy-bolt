import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/login-form';
import { useAuth } from '@/hooks/use-auth';
import { useNotifications } from '@/contexts/notification-context';

// Mock dependencies
jest.mock('next/navigation');
jest.mock('@/hooks/use-auth');
jest.mock('@/contexts/notification-context');

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseNotifications = useNotifications as jest.MockedFunction<typeof useNotifications>;

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  pathname: '/',
};

const mockNotifications = {
  showSuccess: jest.fn(),
  showError: jest.fn(),
  showWarning: jest.fn(),
  showInfo: jest.fn(),
};

const mockAuth = {
  user: null,
  session: null,
  loading: false,
  isAuthenticated: false,
  isUnauthenticated: true,
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  googleSignIn: jest.fn(),
};

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter);
    mockUseAuth.mockReturnValue(mockAuth);
    mockUseNotifications.mockReturnValue(mockNotifications);
  });

  it('should render login form correctly', () => {
    render(<LoginForm />);

    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your Study Teddy account')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByText('Forgot your password?')).toBeInTheDocument();
    expect(screen.getByText('Don\'t have an account?')).toBeInTheDocument();
  });

  it('should update form fields when user types', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('should show validation error for empty fields', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please fill in all fields')).toBeInTheDocument();
    });

    expect(mockNotifications.showWarning).toHaveBeenCalledWith(
      'Please fill in all fields',
      'Validation Error'
    );
    expect(mockAuth.login).not.toHaveBeenCalled();
  });

  it('should show validation error for invalid email', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });

    await user.type(emailInput, 'invalid-email');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });

    expect(mockNotifications.showError).toHaveBeenCalledWith(
      'Please enter a valid email address',
      'Invalid Email'
    );
    expect(mockAuth.login).not.toHaveBeenCalled();
  });

  it('should submit form with valid credentials', async () => {
    const user = userEvent.setup();
    mockAuth.login.mockResolvedValue({
      token: 'mock-token',
      user: { id: '1', email: 'test@example.com', name: 'Test User' },
    });

    render(<LoginForm />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockAuth.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    expect(mockNotifications.showSuccess).toHaveBeenCalledWith(
      'Login successful! Welcome back!',
      'Success'
    );
    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
  });

  it('should handle login errors', async () => {
    const user = userEvent.setup();
    const mockError = {
      response: {
        data: {
          message: 'Invalid credentials',
        },
      },
    };
    mockAuth.login.mockRejectedValue(mockError);

    render(<LoginForm />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });

    expect(mockNotifications.showError).toHaveBeenCalledWith(
      'Invalid credentials',
      'Login Failed'
    );
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('should handle generic login errors', async () => {
    const user = userEvent.setup();
    const mockError = new Error('Network error');
    mockAuth.login.mockRejectedValue(mockError);

    render(<LoginForm />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });

    expect(mockNotifications.showError).toHaveBeenCalledWith(
      'Invalid email or password',
      'Login Failed'
    );
  });

  it('should show loading state during login', async () => {
    const user = userEvent.setup();
    mockAuth.loading = true;
    mockUseAuth.mockReturnValue({ ...mockAuth, loading: true } );

    render(<LoginForm />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: /signing in/i });

    expect(submitButton).toBeDisabled();
    expect(emailInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    expect(screen.getByText('Signing in...')).toBeInTheDocument();
  });

  it('should clear error when user starts typing', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    // First, trigger an error
    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please fill in all fields')).toBeInTheDocument();
    });

    // Then start typing to clear the error
    const emailInput = screen.getByLabelText('Email');
    await user.type(emailInput, 'test@example.com');

    await waitFor(() => {
      expect(screen.queryByText('Please fill in all fields')).not.toBeInTheDocument();
    });
  });

  it('should have correct links', () => {
    render(<LoginForm />);

    const forgotPasswordLink = screen.getByText('Forgot your password?');
    const signUpLink = screen.getByText('Sign up');

    expect(forgotPasswordLink.closest('a')).toHaveAttribute('href', '/forgot-password');
    expect(signUpLink.closest('a')).toHaveAttribute('href', '/register');
  });

  it('should have proper accessibility attributes', () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });

    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('required');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveAttribute('required');
    expect(submitButton).toHaveAttribute('type', 'submit');
  });

  it('should prevent form submission when loading', async () => {
    const user = userEvent.setup();
    mockAuth.loading = true;
    mockUseAuth.mockReturnValue({ ...mockAuth, loading: true } );

    render(<LoginForm />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    // Try to submit by pressing Enter
    await user.keyboard('{Enter}');

    expect(mockAuth.login).not.toHaveBeenCalled();
  });
});