'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Capture the error with Sentry
    const errorId = Sentry.withScope((scope) => {
      scope.setTag('globalError', true);
      scope.setLevel('fatal');
      scope.setContext('global_error', {
        digest: error.digest,
        message: error.message,
        stack: error.stack,
      });

      return Sentry.captureException(error);
    });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Global Error:', error);
    }
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full text-center">
            <div className="mb-8">
              <AlertTriangle className="mx-auto h-16 w-16 text-red-500 mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Application Error
              </h1>
              <p className="text-gray-600 mb-4">
                A critical error occurred and the application needs to be restarted.
                Our team has been automatically notified.
              </p>
              {error.digest && (
                <p className="text-sm text-gray-500 mb-6">
                  Error ID: {error.digest}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Button
                onClick={reset}
                className="w-full"
                variant="default"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Restart Application
              </Button>

              <Button
                onClick={() => window.location.href = '/'}
                className="w-full"
                variant="outline"
              >
                <Home className="mr-2 h-4 w-4" />
                Go to Homepage
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <details className="mt-8 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto text-red-600">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}