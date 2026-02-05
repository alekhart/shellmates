import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rl = checkRateLimit(`magic:${ip}`, 3, 60000);
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { email } = body;
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
  }

  const result = await db.execute(sql`
    SELECT id FROM users WHERE LOWER(email) = LOWER(${email})
  `);

  if (result.rows.length === 0) {
    // Don't reveal if email exists
    return NextResponse.json({ success: true, message: 'If that email exists, a magic link has been generated' });
  }

  const userId = (result.rows[0] as any).id;
  const magicToken = nanoid(32);
  const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await db.execute(sql`
    UPDATE users SET magic_token = ${magicToken}, magic_token_expires = ${expires}
    WHERE id = ${userId}
  `);

  const verifyUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://shellmates.app'}/api/v1/auth/magic-link/verify?token=${magicToken}`;

  return NextResponse.json({
    success: true,
    message: 'If that email exists, a magic link has been generated',
    verify_url: verifyUrl,
  });
}
