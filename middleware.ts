import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Temporarily disable all admin endpoints
  if (request.nextUrl.pathname.startsWith('/api/v1/admin')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Protect authenticated pages — redirect to /login if no session cookie
  const protectedPaths = ['/profile', '/discover', '/matches', '/shop', '/inventory'];
  const isProtected = protectedPaths.some((p) => request.nextUrl.pathname.startsWith(p));
  if (isProtected) {
    const session = request.cookies.get('sh_session');
    if (!session?.value) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/v1/admin/:path*', '/profile/:path*', '/discover/:path*', '/matches/:path*', '/shop/:path*', '/inventory/:path*'],
};
