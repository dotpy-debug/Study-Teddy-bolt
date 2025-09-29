"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export interface AuthUser {
  id: string;
  name?: string;
  email: string;
  image?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name?: string;
}

export const useAuth = () => {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const user: AuthUser | null = session?.user
    ? {
        id: session.user.id,
        name: session.user.name || undefined,
        email: session.user.email,
        image: session.user.image || undefined,
      }
    : null;

  const isLoading = isPending;
  const isAuthenticated = !!session?.user;
  const isUnauthenticated = !isPending && !session?.user;

  const login = async (credentials: LoginCredentials) => {
    const { error } = await authClient.signIn.email({
      email: credentials.email,
      password: credentials.password,
    });
    if (error) throw new Error(error.message || "Login failed");
    return { success: true };
  };

  const register = async (credentials: RegisterCredentials) => {
    const { error } = await authClient.signUp.email({
      email: credentials.email,
      password: credentials.password,
      name: credentials.name,
    });
    if (error) throw new Error(error.message || "Registration failed");
    return { success: true };
  };

  const logout = async () => {
    await authClient.signOut();
    router.push('/login');
  };

  const googleSignIn = async (callbackUrl?: string) => {
    await authClient.signIn.social({ provider: 'google', callbackURL: callbackUrl || '/dashboard' });
  };

  const githubSignIn = async (callbackUrl?: string) => {
    await authClient.signIn.social({ provider: 'github', callbackURL: callbackUrl || '/dashboard' });
  };

  const microsoftSignIn = async (callbackUrl?: string) => {
    await authClient.signIn.social({ provider: 'microsoft', callbackURL: callbackUrl || '/dashboard' });
  };

  const sendEmailOTP = async (email: string) => {
    const { error } = await authClient.emailOtp.sendOtp({ email });
    if (error) throw new Error(error.message || 'Failed to send OTP');
    return { success: true };
  };

  const verifyEmailOTP = async (email: string, otp: string) => {
    const { error } = await authClient.emailOtp.verifyOtp({ email, otp });
    if (error) throw new Error(error.message || 'Invalid OTP');
    return { success: true };
  };

  const updateSession = async (_data: Partial<AuthUser>) => {
    // Better Auth session is server-driven; expose for compatibility
    return;
  };

  return {
    user,
    session,
    isLoading,
    isAuthenticated,
    isUnauthenticated,
    login,
    register,
    logout,
    googleSignIn,
    githubSignIn,
    microsoftSignIn,
    sendEmailOTP,
    verifyEmailOTP,
    updateSession,
    loading: isLoading,
  };
};

export function useRequireAuth(redirectTo?: string) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const currentPath = redirectTo || (typeof window !== 'undefined' ? window.location.pathname : '/dashboard');
      const loginUrl = `/login?callbackUrl=${encodeURIComponent(currentPath)}`;
      router.replace(loginUrl);
    }
  }, [isAuthenticated, isLoading, redirectTo, router]);

  return { isAuthenticated, isLoading };
}

export function useRedirectIfAuthenticated(redirectTo: string = "/dashboard") {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [isAuthenticated, isLoading, redirectTo, router]);

  return { isAuthenticated, isLoading };
}