'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate error ID for tracking
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo);

    // Log error details
    this.logError(error, errorInfo);

    // Report error to monitoring service if available
    this.reportError(error, errorInfo);
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    console.error('React Error Boundary caught an error:', errorDetails);
  };

  private reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      // Report to Sentry with additional context
      const { captureException, withScope } = await import('@sentry/nextjs');

      withScope((scope) => {
        // Add custom context
        scope.setContext('errorBoundary', {
          errorId: this.state.errorId,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
        });

        // Add user context
        const userId = this.getUserId();
        if (userId) {
          scope.setUser({ id: userId });
        }

        // Add tags for filtering
        scope.setTag('errorBoundary', true);
        scope.setTag('component', 'frontend');
        scope.setLevel('error');

        // Capture the exception
        captureException(error);
      });

      // Also report to custom error API for additional tracking
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        userId: this.getUserId(),
      };

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

  private getUserId = (): string | null => {
    // Extract user ID from session, local storage, or context
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

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReportBug = () => {
    const subject = encodeURIComponent(`Bug Report: ${this.state.error?.message || 'Application Error'}`);
    const body = encodeURIComponent(`
Error ID: ${this.state.errorId}
Error Message: ${this.state.error?.message || 'Unknown error'}
URL: ${window.location.href}
Timestamp: ${new Date().toISOString()}

Please describe what you were doing when this error occurred:

`);

    window.open(`mailto:support@studyteddy.com?subject=${subject}&body=${body}`);
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorId, errorInfo } = this.state;
      const showDetails = this.props.showDetails || process.env.NODE_ENV === 'development';

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Oops! Something went wrong
              </CardTitle>
              <CardDescription className="text-gray-600">
                We're sorry, but something unexpected happened. Our team has been notified.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {errorId && (
                <Alert>
                  <AlertDescription>
                    Error ID: <code className="bg-gray-100 px-2 py-1 rounded text-sm">{errorId}</code>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={this.handleRetry} className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button variant="outline" onClick={this.handleReload} className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Page
                </Button>
                <Button variant="outline" onClick={this.handleGoHome} className="flex-1">
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </div>

              <div className="text-center">
                <Button variant="ghost" onClick={this.handleReportBug} className="text-sm">
                  <Bug className="h-4 w-4 mr-2" />
                  Report this issue
                </Button>
              </div>

              {showDetails && error && (
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

                      {error.stack && (
                        <div>
                          <h4 className="font-medium text-red-600">Stack Trace:</h4>
                          <pre className="text-xs text-gray-700 mt-1 overflow-x-auto">
                            {error.stack}
                          </pre>
                        </div>
                      )}

                      {errorInfo?.componentStack && (
                        <div>
                          <h4 className="font-medium text-red-600">Component Stack:</h4>
                          <pre className="text-xs text-gray-700 mt-1 overflow-x-auto">
                            {errorInfo.componentStack}
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

    return this.props.children;
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook for triggering error boundaries from within components
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    // In development, throw the error to trigger the error boundary
    if (process.env.NODE_ENV === 'development') {
      throw error;
    }

    // In production, log the error and optionally report it
    console.error('Handled error:', error, errorInfo);

    // You could also show a toast notification or handle it differently
  };
}

export default ErrorBoundary;