import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check if the application is healthy
    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        api: await checkApiConnection(),
        nextauth: checkNextAuthConfig(),
      },
    };

    // If any service is down, return 503
    const isHealthy = Object.values(healthStatus.services).every(
      service => service === 'ok' || service === 'available'
    );

    return NextResponse.json(
      healthStatus,
      { status: isHealthy ? 200 : 503 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}

async function checkApiConnection(): Promise<string> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      return 'not_configured';
    }

    // Try to reach the backend health endpoint
    const response = await fetch(`${apiUrl}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Short timeout for health checks
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      return 'available';
    } else {
      return 'unavailable';
    }
  } catch (error) {
    console.error('API health check failed:', error);
    return 'unavailable';
  }
}

function checkNextAuthConfig(): string {
  const requiredVars = [
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    return 'misconfigured';
  }

  return 'ok';
}