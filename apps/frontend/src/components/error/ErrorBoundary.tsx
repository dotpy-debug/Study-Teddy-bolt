'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  isolate?: boolean;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
  isReporting: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      isReporting: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: null,
      isReporting: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Track error with Sentry
    const errorId = Sentry.withScope((scope) => {
      scope.setTag('errorBoundary', true);
      scope.setLevel('error');
      scope.setContext('errorBoundary', {
        componentStack: errorInfo.componentStack,
        isolate: this.props.isolate,
      });

      // Add React error boundary specific tags
      scope.setTag('errorBoundary.isolate', this.props.isolate || false);

      const id = Sentry.captureException(error);
      return id;
    });

    this.setState({ errorId });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', error);
      console.error('Component Stack:', errorInfo.componentStack);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: null,
      isReporting: false,
    });
  };

  handleReportFeedback = async () => {
    if (!this.state.errorId) return;

    this.setState({ isReporting: true });

    try {
      // You can integrate with Sentry's User Feedback API here
      Sentry.showReportDialog({
        eventId: this.state.errorId,
        title: 'Something went wrong',
        subtitle: 'Our team has been notified. Please share what you were doing when this occurred.',
        subtitle2: 'Your feedback helps us improve the app.',
        labelClose: 'Close',
        labelSubmit: 'Submit Report',
        labelName: 'Name',
        labelEmail: 'Email',
        labelComments: 'What happened?',
      });
    } catch (error) {
      console.error('Failed to show feedback dialog:', error);
    } finally {
      this.setState({ isReporting: false });
    }
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full text-center">
            <div className="mb-8">
              <AlertTriangle className="mx-auto h-16 w-16 text-red-500 mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Something went wrong
              </h1>
              <p className="text-gray-600 mb-4">
                We're sorry, but something unexpected happened. Our team has been notified and is working to fix the issue.
              </p>
              {this.state.errorId && (
                <p className="text-sm text-gray-500 mb-6">
                  Error ID: {this.state.errorId}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Button
                onClick={this.handleReset}
                className="w-full"
                variant="default"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>

              <Button
                onClick={this.handleGoHome}
                className="w-full"
                variant="outline"
              >
                <Home className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Button>

              {this.state.errorId && (
                <Button
                  onClick={this.handleReportFeedback}
                  className="w-full"
                  variant="secondary"
                  disabled={this.state.isReporting}
                >
                  <Bug className="mr-2 h-4 w-4" />
                  {this.state.isReporting ? 'Reporting...' : 'Report Issue'}
                </Button>
              )}
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-8 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto text-red-600">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    fallback?: ReactNode;
    isolate?: boolean;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
  }
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...options}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Specialized error boundaries for different sections
export const DashboardErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    isolate={true}
    onError={(error, errorInfo) => {
      Sentry.withScope((scope) => {
        scope.setTag('section', 'dashboard');
        scope.setContext('dashboard_error', {
          componentStack: errorInfo.componentStack,
        });
        Sentry.captureException(error);
      });
    }}
  >
    {children}
  </ErrorBoundary>
);

export const StudySessionErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    isolate={true}
    onError={(error, errorInfo) => {
      Sentry.withScope((scope) => {
        scope.setTag('section', 'study_session');
        scope.setLevel('error');
        scope.setContext('study_session_error', {
          componentStack: errorInfo.componentStack,
        });
        Sentry.captureException(error);
      });
    }}
  >
    {children}
  </ErrorBoundary>
);

export const TaskManagementErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    isolate={true}
    onError={(error, errorInfo) => {
      Sentry.withScope((scope) => {
        scope.setTag('section', 'task_management');
        scope.setContext('task_management_error', {
          componentStack: errorInfo.componentStack,
        });
        Sentry.captureException(error);
      });
    }}
  >
    {children}
  </ErrorBoundary>
);

export const AIFeaturesErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    isolate={true}
    onError={(error, errorInfo) => {
      Sentry.withScope((scope) => {
        scope.setTag('section', 'ai_features');
        scope.setLevel('error');
        scope.setContext('ai_features_error', {
          componentStack: errorInfo.componentStack,
        });
        Sentry.captureException(error);
      });
    }}
  >
    {children}
  </ErrorBoundary>
);