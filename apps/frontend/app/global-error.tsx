'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const errorId = React.useMemo(() =>
    `global_err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    []
  );

  useEffect(() => {
    // Log the global error
    console.error('Global Application Error:', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      errorId,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
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
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        type: 'global_error',
      };

      // Only report in production and if window is available
      if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
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
      console.error('Failed to report global error:', reportingError);
    }
  };

  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          backgroundColor: '#f9fafb',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            padding: '2rem',
            maxWidth: '32rem',
            width: '100%',
            textAlign: 'center',
          }}>
            <div style={{
              backgroundColor: '#fee2e2',
              borderRadius: '50%',
              padding: '0.75rem',
              width: 'fit-content',
              margin: '0 auto 1rem',
            }}>
              <AlertTriangle style={{
                height: '2rem',
                width: '2rem',
                color: '#dc2626',
              }} />
            </div>

            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '0.5rem',
            }}>
              Application Error
            </h1>

            <p style={{
              color: '#6b7280',
              marginBottom: '1.5rem',
            }}>
              A critical error occurred that prevented the application from loading properly.
              Our team has been notified.
            </p>

            <div style={{
              backgroundColor: '#f3f4f6',
              padding: '0.75rem',
              borderRadius: '0.375rem',
              marginBottom: '1.5rem',
            }}>
              <p style={{
                fontSize: '0.875rem',
                color: '#374151',
              }}>
                Error ID: <code style={{
                  backgroundColor: '#e5e7eb',
                  padding: '0.125rem 0.5rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.875rem',
                }}>{errorId}</code>
              </p>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}>
              <button
                onClick={reset}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                }}
              >
                <RefreshCw style={{ height: '1rem', width: '1rem' }} />
                Try Again
              </button>

              <button
                onClick={handleReload}
                style={{
                  backgroundColor: 'white',
                  color: '#374151',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                <RefreshCw style={{ height: '1rem', width: '1rem' }} />
                Reload Page
              </button>

              <button
                onClick={handleGoHome}
                style={{
                  backgroundColor: 'white',
                  color: '#374151',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                <Home style={{ height: '1rem', width: '1rem' }} />
                Go Home
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <details style={{ marginTop: '1.5rem', textAlign: 'left' }}>
                <summary style={{
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                }}>
                  Error Details (Development)
                </summary>
                <div style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '0.5rem',
                }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ fontWeight: '500', color: '#dc2626', marginBottom: '0.25rem' }}>
                      Error Message:
                    </h4>
                    <p style={{ fontSize: '0.875rem', color: '#1f2937' }}>
                      {error.message}
                    </p>
                  </div>

                  {error.digest && (
                    <div style={{ marginBottom: '1rem' }}>
                      <h4 style={{ fontWeight: '500', color: '#dc2626', marginBottom: '0.25rem' }}>
                        Error Digest:
                      </h4>
                      <p style={{ fontSize: '0.875rem', color: '#1f2937' }}>
                        {error.digest}
                      </p>
                    </div>
                  )}

                  {error.stack && (
                    <div>
                      <h4 style={{ fontWeight: '500', color: '#dc2626', marginBottom: '0.25rem' }}>
                        Stack Trace:
                      </h4>
                      <pre style={{
                        fontSize: '0.75rem',
                        color: '#374151',
                        overflowX: 'auto',
                        whiteSpace: 'pre-wrap',
                      }}>
                        {error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}