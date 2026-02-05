import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { generateId } from '@/lib/ids';
import { hashPassword, createSession, setSessionCookie } from '@/lib/user-auth';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rl = checkRateLimit(`register:${ip}`, 5, 60000);
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { email, username, password, confirm } = body;

  if (!email || !username || !password || !confirm) {
    return NextResponse.json({ success: false, error: 'All fields are required' }, { status: 400 });
  }

  if (typeof email !== 'string' || !email.includes('@') || email.length > 255) {
    return NextResponse.json({ success: false, error: 'Invalid email' }, { status: 400 });
  }

  if (typeof username !== 'string' || username.length < 2 || username.length > 30 || !/^[a-zA-Z0-9_-]+$/.test(username)) {
    return NextResponse.json({ success: false, error: 'Username must be 2-30 chars, alphanumeric, hyphens, underscores' }, { status: 400 });
  }

  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return NextResponse.json({ success: false, error: 'Password must be 8-128 characters' }, { status: 400 });
  }

  if (password !== confirm) {
    return NextResponse.json({ success: false, error: 'Passwords do not match' }, { status: 400 });
  }

  // Check for existing email/username
  const existing = await db.execute(sql`
    SELECT id FROM users WHERE LOWER(email) = LOWER(${email}) OR LOWER(username) = LOWER(${username}) LIMIT 1
  `);
  if (existing.rows.length > 0) {
    return NextResponse.json({ success: false, error: 'Email or username already taken' }, { status: 409 });
  }

  const id = generateId('usr');
  const passwordHash = await hashPassword(password);

  await db.execute(sql`
    INSERT INTO users (id, email, username, password_hash)
    VALUES (${id}, ${email.toLowerCase()}, ${username}, ${passwordHash})
  `);

  const token = await createSession(id);
  setSessionCookie(token);

  return NextResponse.json({
    success: true,
    user: { id, email: email.toLowerCase(), username, avatar_emoji: '😊', avatar_color: '#ec4899' },
  });
}
