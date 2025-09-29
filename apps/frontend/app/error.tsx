'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const errorId = React.useMemo(() =>
    `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    []
  );

  useEffect(() => {
    // Log the error
    console.error('Application Error:', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      errorId,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    });

    // Report error to monitoring service
    reportError(error, errorId);
  }, [error, errorId]);

  const reportError = async (error: Error, errorId: string) => {
    try {
      const errorReport = {
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        errorId,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        userId: getUserId(),
      };

      // Report to your error tracking service
      if (process.env.NODE_ENV === 'production') {
        await fetch('/api/errors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(errorReport),
        }).catch(() => {
          // Silently fail if error reporting fails
        });
      }
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  const getUserId = (): string | null => {
    try {
      const session = localStorage.getItem('session');
      if (session) {
        const parsed = JSON.parse(session);
        return parsed.user?.id || null;
      }
    } catch {
      // Ignore parsing errors
    }
    return null;
  };

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleReportBug = () => {
    const subject = encodeURIComponent(`Bug Report: ${error.message || 'Application Error'}`);
    const body = encodeURIComponent(`
Error ID: ${errorId}
Error Message: ${error.message || 'Unknown error'}
Error Digest: ${error.digest || 'N/A'}
URL: ${window.location.href}
Timestamp: ${new Date().toISOString()}

Please describe what you were doing when this error occurred:

`);

    window.open(`mailto:support@studyteddy.com?subject=${subject}&body=${body}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Something went wrong!
          </CardTitle>
          <CardDescription className="text-gray-600">
            We encountered an unexpected error. Our team has been notified and is working on a fix.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert>
            <AlertDescription>
              Error ID: <code className="bg-gray-100 px-2 py-1 rounded text-sm">{errorId}</code>
            </AlertDescription>
          </Alert>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={reset} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button variant="outline" onClick={handleReload} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Page
            </Button>
            <Button variant="outline" onClick={handleGoHome} className="flex-1">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </div>

          <div className="text-center">
            <Button variant="ghost" onClick={handleReportBug} className="text-sm">
              <Bug className="h-4 w-4 mr-2" />
              Report this issue
            </Button>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-6">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                Error Details (Development)
              </summary>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-red-600">Error Message:</h4>
                    <p className="text-sm text-gray-800 mt-1">{error.message}</p>
                  </div>

                  {error.digest && (
                    <div>
                      <h4 className="font-medium text-red-600">Error Digest:</h4>
                      <p className="text-sm text-gray-800 mt-1">{error.digest}</p>
                    </div>
                  )}

                  {error.stack && (
                    <div>
                      <h4 className="font-medium text-red-600">Stack Trace:</h4>
                      <pre className="text-xs text-gray-700 mt-1 overflow-x-auto">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}