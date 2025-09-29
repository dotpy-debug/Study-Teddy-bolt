import { NextRequest, NextResponse } from 'next/server';

interface ErrorReport {
  errorId: string;
  message: string;
  stack?: string;
  timestamp: string;
  url: string;
  userAgent: string;
  userId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, unknown>;
  type?: string;
}

interface ErrorReportRequest {
  errors?: ErrorReport[];
  error?: ErrorReport;
  // Support both single error and batch reporting
}

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(ip: string): string {
  return `error_report:${ip}`;
}

function isRateLimited(ip: string): boolean {
  const key = getRateLimitKey(ip);
  const now = Date.now();
  const limit = rateLimitStore.get(key);

  if (!limit || now > limit.resetTime) {
    // Reset or create new limit
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + 60000, // 1 minute window
    });
    return false;
  }

  if (limit.count >= 10) { // Max 10 error reports per minute per IP
    return true;
  }

  limit.count++;
  return false;
}

function sanitizeErrorData(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  // Remove sensitive information
  const sensitiveKeys = [
    'password', 'token', 'authorization', 'cookie', 'session',
    'secret', 'key', 'private', 'credentials', 'auth'
  ];

  const sanitized = { ...data as Record<string, unknown> };

  for (const key in sanitized) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeErrorData(sanitized[key]);
    }
  }

  return sanitized;
}

function validateErrorReport(report: unknown): ErrorReport | null {
  if (!report || typeof report !== 'object') {
    return null;
  }

  const reportObj = report as Record<string, unknown>;

  // Required fields
  if (!reportObj.errorId || !reportObj.message || !reportObj.timestamp) {
    return null;
  }

  // Validate severity
  const validSeverities = ['low', 'medium', 'high', 'critical'];
  if (!validSeverities.includes(reportObj.severity as string)) {
    reportObj.severity = 'medium'; // Default severity
  }

  // Sanitize and limit field lengths
  return {
    errorId: String(reportObj.errorId).slice(0, 100),
    message: String(reportObj.message).slice(0, 1000),
    stack: reportObj.stack ? String(reportObj.stack).slice(0, 5000) : undefined,
    timestamp: String(reportObj.timestamp),
    url: String(reportObj.url || '').slice(0, 500),
    userAgent: String(reportObj.userAgent || '').slice(0, 500),
    userId: reportObj.userId ? String(reportObj.userId).slice(0, 100) : undefined,
    severity: reportObj.severity as 'low' | 'medium' | 'high' | 'critical',
    context: reportObj.context ? sanitizeErrorData(reportObj.context) as Record<string, unknown> : undefined,
    type: reportObj.type ? String(reportObj.type).slice(0, 100) : undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.ip ||
               request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown';

    // Check rate limit
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const body: ErrorReportRequest = await request.json();

    // Handle both single error and batch reporting
    let errorReports: ErrorReport[] = [];

    if (body.errors && Array.isArray(body.errors)) {
      errorReports = body.errors
        .map(validateErrorReport)
        .filter(Boolean) as ErrorReport[];
    } else if (body.error) {
      const validatedError = validateErrorReport(body.error);
      if (validatedError) {
        errorReports = [validatedError];
      }
    } else {
      // Try to validate the body as a single error report
      const validatedError = validateErrorReport(body);
      if (validatedError) {
        errorReports = [validatedError];
      }
    }

    if (errorReports.length === 0) {
      return NextResponse.json(
        { error: 'No valid error reports found' },
        { status: 400 }
      );
    }

    // Limit batch size
    if (errorReports.length > 20) {
      errorReports = errorReports.slice(0, 20);
    }

    // Process error reports
    for (const errorReport of errorReports) {
      await processErrorReport(errorReport, request);
    }

    return NextResponse.json({
      success: true,
      processed: errorReports.length,
    });

  } catch (error) {
    console.error('Error processing error report:', error);

    return NextResponse.json(
      { error: 'Failed to process error report' },
      { status: 500 }
    );
  }
}

async function processErrorReport(errorReport: ErrorReport, request: NextRequest): Promise<void> {
  try {
    // Enhanced error data for logging
    const enhancedReport = {
      ...errorReport,
      receivedAt: new Date().toISOString(),
      clientIp: request.ip,
      headers: {
        userAgent: request.headers.get('user-agent'),
        referer: request.headers.get('referer'),
        origin: request.headers.get('origin'),
      },
    };

    // Log to console (in production, you'd send to your logging service)
    const logLevel = getLogLevel(errorReport.severity);

    if (process.env.NODE_ENV === 'production') {
      // In production, you might want to:
      // 1. Send to external logging service (e.g., Sentry, LogRocket, Datadog)
      // 2. Store in database for analysis
      // 3. Alert based on severity

      console[logLevel]('Frontend Error Report:', JSON.stringify(enhancedReport, null, 2));

      // Example: Send to external service
      // await sendToMonitoringService(enhancedReport);

      // Example: Store in database
      // await storeErrorReport(enhancedReport);

      // Example: Send alerts for critical errors
      if (errorReport.severity === 'critical') {
        // await sendCriticalErrorAlert(enhancedReport);
      }
    } else {
      // Development logging
      console.group(`🔥 Frontend Error Report [${errorReport.severity.toUpperCase()}]`);
      console.error('Error ID:', errorReport.errorId);
      console.error('Message:', errorReport.message);
      console.error('URL:', errorReport.url);
      if (errorReport.userId) {
        console.error('User ID:', errorReport.userId);
      }
      if (errorReport.context) {
        console.error('Context:', errorReport.context);
      }
      if (errorReport.stack) {
        console.error('Stack:', errorReport.stack);
      }
      console.groupEnd();
    }

  } catch (processingError) {
    console.error('Failed to process error report:', processingError);
  }
}

function getLogLevel(severity: string): 'error' | 'warn' | 'info' {
  switch (severity) {
    case 'critical':
    case 'high':
      return 'error';
    case 'medium':
      return 'warn';
    default:
      return 'info';
  }
}

// Example function for sending to external monitoring service
// async function sendToMonitoringService(errorReport: ErrorReport): Promise<void> {
//   try {
//     // Example: Sentry
//     // Sentry.captureException(new Error(errorReport.message), {
//     //   extra: errorReport,
//     //   tags: {
//     //     severity: errorReport.severity,
//     //     errorId: errorReport.errorId,
//     //   },
//     // });
//
//     // Example: Custom service
//     // await fetch('https://your-monitoring-service.com/errors', {
//     //   method: 'POST',
//     //   headers: { 'Content-Type': 'application/json' },
//     //   body: JSON.stringify(errorReport),
//     // });
//   } catch (error) {
//     console.error('Failed to send error to monitoring service:', error);
//   }
// }

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}