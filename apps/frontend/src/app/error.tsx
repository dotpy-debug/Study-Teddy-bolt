'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Capture the error with Sentry
    const errorId = Sentry.withScope((scope) => {
      scope.setTag('pageError', true);
      scope.setLevel('error');
      scope.setContext('page_error', {
        digest: error.digest,
        message: error.message,
        stack: error.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
      });

      return Sentry.captureException(error);
    });

    // Track error in analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false,
      });
    }
  }, [error]);

  const isNetworkError = error.message.includes('fetch') || error.message.includes('network');
  const isChunkError = error.message.includes('ChunkLoadError') || error.message.includes('Loading chunk');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <AlertTriangle className="mx-auto h-16 w-16 text-amber-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isNetworkError ? 'Connection Problem' :
             isChunkError ? 'Loading Problem' :
             'Something went wrong'}
          </h1>
          <p className="text-gray-600 mb-4">
            {isNetworkError ?
              'Please check your internet connection and try again.' :
             isChunkError ?
              'The app has been updated. Please refresh the page.' :
              'An error occurred while loading this page. Our team has been notified.'}
          </p>
          {error.digest && (
            <p className="text-sm text-gray-500 mb-6">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="space-y-3">
          {isChunkError ? (
            <Button
              onClick={() => window.location.reload()}
              className="w-full"
              variant="default"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Page
            </Button>
          ) : (
            <Button
              onClick={reset}
              className="w-full"
              variant="default"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}

          <Button
            onClick={() => window.history.back()}
            className="w-full"
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>

          <Button
            onClick={() => window.location.href = '/dashboard'}
            className="w-full"
            variant="secondary"
          >
            <Home className="mr-2 h-4 w-4" />
            Go to Dashboard
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
  );
}