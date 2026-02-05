import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Temporarily disable all admin endpoints
  if (request.nextUrl.pathname.startsWith('/api/v1/admin')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Protect /profile — redirect to /login if no session cookie
  if (request.nextUrl.pathname.startsWith('/profile')) {
    const session = request.cookies.get('sh_session');
    if (!session?.value) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/v1/admin/:path*', '/profile/:path*'],
};
