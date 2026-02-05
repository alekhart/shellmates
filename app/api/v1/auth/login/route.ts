import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { verifyPassword, createSession, setSessionCookie, sanitizeUser } from '@/lib/user-auth';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rl = checkRateLimit(`login:${ip}`, 10, 60000);
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 });
  }

  const result = await db.execute(sql`
    SELECT id, email, password_hash, username, display_name, bio,
           avatar_emoji, avatar_color, is_verified, created_at, last_login
    FROM users WHERE LOWER(email) = LOWER(${email})
  `);

  if (result.rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
  }

  const user = result.rows[0] as any;

  if (!user.password_hash) {
    return NextResponse.json({ success: false, error: 'Account uses magic link login' }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
  }

  // Update last_login
  await db.execute(sql`UPDATE users SET last_login = NOW() WHERE id = ${user.id}`);

  const token = await createSession(user.id);
  setSessionCookie(token);

  return NextResponse.json({
    success: true,
    user: sanitizeUser({ ...user, uid: user.id }),
  });
}
