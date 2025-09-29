"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";
import Link from "next/link";
import { Eye, EyeOff, Chrome, Github, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/contexts/notification-context";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine((val) => val === true, "You must accept the terms and conditions"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGithubLoading, setIsGithubLoading] = useState(false);
  const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false);

  const router = useRouter();
  const { showSuccess, showError } = useNotifications();
  const { register: registerUser, googleSignIn, githubSignIn, microsoftSignIn } = useAuth();

  const form = useForm<z.input<typeof registerSchema>, any, z.output<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);

      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
      });

      showSuccess("Welcome to Study Teddy. You have been automatically signed in.", "Account created successfully!");
      router.push("/dashboard");
    } catch (error: any) {
      showError(error?.message || "Failed to create account. Please try again.", "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      setIsGoogleLoading(true);
      await googleSignIn("/dashboard");
    } catch (error: any) {
      showError("Failed to sign up with Google. Please try again.", "Error");
      setIsGoogleLoading(false);
    }
  };

  const handleGithubSignUp = async () => {
    try {
      setIsGithubLoading(true);
      await githubSignIn("/dashboard");
    } catch (error: any) {
      showError("Failed to sign up with GitHub. Please try again.", "Error");
      setIsGithubLoading(false);
    }
  };

  const handleMicrosoftSignUp = async () => {
    try {
      setIsMicrosoftLoading(true);
      await microsoftSignIn("/dashboard");
    } catch (error: any) {
      showError("Failed to sign up with Microsoft. Please try again.", "Error");
      setIsMicrosoftLoading(false);
    }
  };

  const passwordStrength = form.watch("password");
  const getPasswordStrengthColor = () => {
    if (!passwordStrength) return "bg-gray-200";
    if (passwordStrength.length < 6) return "bg-red-500";
    if (passwordStrength.length < 8) return "bg-yellow-500";
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordStrength)) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getPasswordStrengthWidth = () => {
    if (!passwordStrength) return "0%";
    if (passwordStrength.length < 6) return "25%";
    if (passwordStrength.length < 8) return "50%";
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordStrength)) return "75%";
    return "100%";
  };

  return (
    <>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
        <CardDescription>
          Start your learning journey with Study Teddy today
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your full name"
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
                    <div className="space-y-2">
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a password"
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
                      {passwordStrength && (
                        <div className="space-y-1">
                          <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                              style={{ width: getPasswordStrengthWidth() }}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div className="flex items-center space-x-2">
                              <Check className={`h-3 w-3 ${passwordStrength.length >= 8 ? "text-green-500" : "text-gray-400"}`} />
                              <span>At least 8 characters</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Check className={`h-3 w-3 ${/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordStrength) ? "text-green-500" : "text-gray-400"}`} />
                              <span>Contains uppercase, lowercase, and number</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        disabled={isLoading}
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={isLoading}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        <span className="sr-only">
                          {showConfirmPassword ? "Hide password" : "Show password"}
                        </span>
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="acceptTerms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm">
                      I agree to the{" "}
                      <Link href="/terms" className="text-primary hover:underline">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" className="text-primary hover:underline">
                        Privacy Policy
                      </Link>
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Create account"}
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
            onClick={handleGoogleSignUp}
            disabled={isGoogleLoading}
          >
            <Chrome className="mr-2 h-4 w-4" />
            {isGoogleLoading ? "Connecting..." : "Sign up with Google"}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleGithubSignUp}
            disabled={isGithubLoading}
          >
            <Github className="mr-2 h-4 w-4" />
            {isGithubLoading ? "Connecting..." : "Sign up with GitHub"}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleMicrosoftSignUp}
            disabled={isMicrosoftLoading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z" />
            </svg>
            {isMicrosoftLoading ? "Connecting..." : "Sign up with Microsoft"}
          </Button>
        </div>
      </CardContent>

      <CardFooter className="flex-col space-y-4">
        <div className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </CardFooter>
    </>
  );
}