import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { createSession, setSessionCookie } from '@/lib/user-auth';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
  }

  const result = await db.execute(sql`
    SELECT id, magic_token_expires FROM users WHERE magic_token = ${token}
  `);

  if (result.rows.length === 0) {
    return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
  }

  const user = result.rows[0] as any;
  if (new Date(user.magic_token_expires) < new Date()) {
    return NextResponse.redirect(new URL('/login?error=expired_token', request.url));
  }

  // Clear magic token and update last_login
  await db.execute(sql`
    UPDATE users SET magic_token = NULL, magic_token_expires = NULL, last_login = NOW()
    WHERE id = ${user.id}
  `);

  const sessionToken = await createSession(user.id);
  setSessionCookie(sessionToken);

  return NextResponse.redirect(new URL('/profile', request.url));
}
