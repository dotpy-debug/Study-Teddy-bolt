"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";
import Link from "next/link";
import { Eye, EyeOff, Chrome, Github, Mail } from "lucide-react";
import type { Route } from "next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/contexts/notification-context";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGithubLoading, setIsGithubLoading] = useState(false);
  const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false);
  const [showEmailOTP, setShowEmailOTP] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpLoading, setIsOtpLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccess, showError } = useNotifications();
  const { login, googleSignIn, githubSignIn, microsoftSignIn, sendEmailOTP, verifyEmailOTP } = useAuth();

  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const form = useForm<z.input<typeof loginSchema>, unknown, z.output<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      await login(data);
      showSuccess("You have been signed in successfully.", "Success");
      router.push(callbackUrl as Route);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Invalid email or password. Please try again.";
      showError(errorMessage, "Error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      await googleSignIn(callbackUrl);
    } catch (error: unknown) {
      showError("Failed to sign in with Google. Please try again.", "Error");
      setIsGoogleLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    try {
      setIsGithubLoading(true);
      await githubSignIn(callbackUrl);
    } catch (error: unknown) {
      showError("Failed to sign in with GitHub. Please try again.", "Error");
      setIsGithubLoading(false);
    }
  };

  const handleMicrosoftSignIn = async () => {
    try {
      setIsMicrosoftLoading(true);
      await microsoftSignIn(callbackUrl);
    } catch (error: unknown) {
      showError("Failed to sign in with Microsoft. Please try again.", "Error");
      setIsMicrosoftLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!otpEmail || !z.string().email().safeParse(otpEmail).success) {
      showError("Please enter a valid email address", "Error");
      return;
    }
    try {
      setIsOtpLoading(true);
      await sendEmailOTP(otpEmail);
      showSuccess("OTP sent to your email", "Success");
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : "Failed to send OTP", "Error");
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      showError("Please enter a valid 6-digit OTP", "Error");
      return;
    }
    try {
      setIsOtpLoading(true);
      await verifyEmailOTP(otpEmail, otp);
      showSuccess("Successfully signed in!", "Success");
      router.push(callbackUrl as Route);
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : "Invalid OTP", "Error");
    } finally {
      setIsOtpLoading(false);
    }
  };

  return (
    <>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
        <CardDescription>
          Sign in to your account to continue your learning journey
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        disabled={isLoading}
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        <span className="sr-only">
                          {showPassword ? "Hide password" : "Show password"}
                        </span>
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-end">
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-primary hover:underline"
              >
                Forgot your password?
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </Form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            <Chrome className="mr-2 h-4 w-4" />
            {isGoogleLoading ? "Connecting..." : "Continue with Google"}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleGithubSignIn}
            disabled={isGithubLoading}
          >
            <Github className="mr-2 h-4 w-4" />
            {isGithubLoading ? "Connecting..." : "Continue with GitHub"}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleMicrosoftSignIn}
            disabled={isMicrosoftLoading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z" />
            </svg>
            {isMicrosoftLoading ? "Connecting..." : "Continue with Microsoft"}
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or use email OTP</span>
          </div>
        </div>

        {!showEmailOTP ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowEmailOTP(true)}
          >
            <Mail className="mr-2 h-4 w-4" />
            Sign in with Email OTP
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={otpEmail}
                  onChange={(e) => setOtpEmail(e.target.value)}
                  disabled={isOtpLoading}
                />
                <Button
                  onClick={handleSendOTP}
                  disabled={isOtpLoading || !otpEmail}
                  variant="outline"
                >
                  {isOtpLoading ? "Sending..." : "Send OTP"}
                </Button>
              </div>
            </div>

            {otpEmail && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Verification Code</label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    disabled={isOtpLoading}
                    maxLength={6}
                  />
                  <Button
                    onClick={handleVerifyOTP}
                    disabled={isOtpLoading || otp.length !== 6}
                  >
                    {isOtpLoading ? "Verifying..." : "Verify"}
                  </Button>
                </div>
              </div>
            )}

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setShowEmailOTP(false);
                setOtpEmail('');
                setOtp('');
              }}
            >
              Back to password login
            </Button>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex-col space-y-4">
        <div className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </div>
      </CardFooter>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}