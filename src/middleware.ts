import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth'; // verifyToken is now async

// Middleware runs on the Edge, making jose a good choice here

export async function middleware(request: NextRequest) { // Make middleware async
  // Paths that don't require authentication
  const publicPaths = ['/login', '/register'];
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path));

  // API paths that don't require authentication
  const publicApiPaths = ['/api/auth/login', '/api/auth/register'];
  const isPublicApiPath = publicApiPaths.some(path => request.nextUrl.pathname.startsWith(path));

  // Allow access to public paths and public API paths
  if (isPublicPath || isPublicApiPath) {
    return NextResponse.next();
  }

  // Get the token from the cookies
  const token = request.cookies.get('auth-token')?.value;

  // If there's no token, deny access
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    console.log('Middleware: No token found, redirecting to login.');

    // If it's an API route (and not public), return 401 Unauthorized
    if (request.nextUrl.pathname.startsWith('/api')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    // For non-API routes, redirect to login page
    return NextResponse.redirect(url);
  }

  // Verify the token (this is now an async operation)
  const decodedPayload = await verifyToken(token);

  // If the token is invalid or expired, deny access
  if (!decodedPayload) {
     const url = request.nextUrl.clone();
     url.pathname = '/login';
     console.log('Middleware: Invalid token, redirecting to login.');

     // Clear the invalid cookie (optional but good practice)
     const response = request.nextUrl.pathname.startsWith('/api')
       ? NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
       : NextResponse.redirect(url);

     response.cookies.delete('auth-token');
     return response;
  }

  // const requestHeaders = new Headers(request.headers);
  // requestHeaders.set('x-user-id', decodedPayload.id);
  // requestHeaders.set('x-user-email', decodedPayload.email);
  // return NextResponse.next({ request: { headers: requestHeaders } });

  console.log(`Middleware: Token verified for user ID: ${decodedPayload.id}`);
  return NextResponse.next();
}

// Apply middleware to matching routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};