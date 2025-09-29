"use client";

import { useRedirectIfAuthenticated } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  // Redirect authenticated users to dashboard
  useRedirectIfAuthenticated();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="flex min-h-screen">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-12">
          <div className="mx-auto max-w-sm">
            <div className="flex items-center space-x-3 mb-8">
              <Image
                src="/logo.jpg"
                alt="Study Teddy Logo"
                width={48}
                height={48}
                className="rounded-xl shadow-sm"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Study Teddy
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your AI Learning Companion
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                  Transform your learning journey
                </h2>
                <p className="mt-3 text-gray-600 dark:text-gray-400">
                  Join thousands of students who are already accelerating their learning with AI-powered study tools.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Personalized study plans
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    AI-powered learning assistance
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Progress tracking and analytics
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Auth forms */}
        <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-8">
          <div className="mx-auto w-full max-w-md">
            {/* Mobile logo */}
            <div className="mb-8 flex items-center justify-center lg:hidden">
              <Link href="/" className="flex items-center space-x-2">
                <Image
                  src="/logo.jpg"
                  alt="Study Teddy Logo"
                  width={40}
                  height={40}
                  className="rounded-xl shadow-sm"
                />
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  Study Teddy
                </span>
              </Link>
            </div>

            <Card className="border-0 shadow-lg">
              {children}
            </Card>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                By continuing, you agree to our{" "}
                <Link
                  href={"/terms" as Route}
                  className="font-medium text-primary hover:underline"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href={"/privacy" as Route}
                  className="font-medium text-primary hover:underline"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}