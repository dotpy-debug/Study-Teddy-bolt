import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow e2e test runner to bypass auth redirects
  if (process.env.PLAYWRIGHT === '1') {
    return NextResponse.next();
  }

  // Skip static assets and auth API
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/auth/') ||
    pathname.match(/\.(ico|png|jpg|jpeg|gif|svg|webp|css|js|woff|woff2|ttf|eot)$/)
  ) {
    return NextResponse.next();
  }

  // Fetch Better Auth session
  let hasSession = false;
  try {
    const res = await fetch(new URL('/api/auth/session', req.url), {
      headers: { cookie: req.headers.get('cookie') || '' },
    });
    if (res.ok) {
      const data = await res.json();
      hasSession = !!data?.user;
    }
  } catch {
    hasSession = false;
  }

  // Define protected routes
  const protectedRoutes = ['/dashboard', '/tasks', '/focus', '/subjects', '/calendar', '/profile', '/settings'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // Redirect unauthenticated users from protected routes
  if (!hasSession && isProtectedRoute) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (hasSession && ['/login', '/register', '/forgot-password'].includes(pathname)) {
    const callbackUrl = req.nextUrl.searchParams.get('callbackUrl') || req.nextUrl.searchParams.get('from');
    const redirectUrl = callbackUrl || '/dashboard';
    return NextResponse.redirect(new URL(redirectUrl, req.url));
  }

  // Root path redirect
  if (pathname === '/') {
    return NextResponse.redirect(new URL(hasSession ? '/dashboard' : '/login', req.url));
  }

  const response = NextResponse.next();
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  }
  if (process.env.NODE_ENV === 'development') {
    response.headers.set('X-Auth-Status', hasSession ? 'authenticated' : 'unauthenticated');
  }
  return response;
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)',
  ],
};