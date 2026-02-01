import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Temporarily disable all admin endpoints
  if (request.nextUrl.pathname.startsWith('/api/v1/admin')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/v1/admin/:path*',
};
