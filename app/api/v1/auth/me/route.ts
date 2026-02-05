import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { getSessionUser, getSessionToken, validateSession } from '@/lib/user-auth';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  return NextResponse.json({ success: true, user });
}

export async function PATCH(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rl = checkRateLimit(`me-patch:${ip}`, 10, 60000);
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
  }

  const token = getSessionToken();
  if (!token) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const user = await validateSession(token);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const allowed = ['display_name', 'bio', 'avatar_emoji', 'avatar_color', 'username'];
  const updates: string[] = [];
  const values: any[] = [];

  for (const key of allowed) {
    if (body[key] !== undefined) {
      if (key === 'username') {
        const u = body[key];
        if (typeof u !== 'string' || u.length < 2 || u.length > 30 || !/^[a-zA-Z0-9_-]+$/.test(u)) {
          return NextResponse.json({ success: false, error: 'Invalid username' }, { status: 400 });
        }
        // Check uniqueness
        const existing = await db.execute(sql`
          SELECT id FROM users WHERE LOWER(username) = LOWER(${u}) AND id != ${user.id}
        `);
        if (existing.rows.length > 0) {
          return NextResponse.json({ success: false, error: 'Username already taken' }, { status: 409 });
        }
      }
      if (key === 'avatar_emoji' && typeof body[key] === 'string' && body[key].length > 10) {
        return NextResponse.json({ success: false, error: 'Invalid avatar emoji' }, { status: 400 });
      }
      if (key === 'avatar_color' && typeof body[key] === 'string' && !/^#[0-9a-fA-F]{6}$/.test(body[key])) {
        return NextResponse.json({ success: false, error: 'Invalid color format' }, { status: 400 });
      }
      if (key === 'bio' && typeof body[key] === 'string' && body[key].length > 500) {
        return NextResponse.json({ success: false, error: 'Bio too long (max 500)' }, { status: 400 });
      }
      if (key === 'display_name' && typeof body[key] === 'string' && body[key].length > 50) {
        return NextResponse.json({ success: false, error: 'Display name too long (max 50)' }, { status: 400 });
      }
      updates.push(key);
      values.push(body[key]);
    }
  }

  if (updates.length === 0) {
    return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
  }

  // Build update using individual field queries to stay compatible with drizzle sql``
  const fieldMap: Record<string, any> = {};
  for (let i = 0; i < updates.length; i++) {
    fieldMap[updates[i]] = values[i];
  }

  // Update each field individually (simple and safe with sql tagged templates)
  for (const [key, val] of Object.entries(fieldMap)) {
    switch (key) {
      case 'display_name':
        await db.execute(sql`UPDATE users SET display_name = ${val} WHERE id = ${user.id}`);
        break;
      case 'bio':
        await db.execute(sql`UPDATE users SET bio = ${val} WHERE id = ${user.id}`);
        break;
      case 'avatar_emoji':
        await db.execute(sql`UPDATE users SET avatar_emoji = ${val} WHERE id = ${user.id}`);
        break;
      case 'avatar_color':
        await db.execute(sql`UPDATE users SET avatar_color = ${val} WHERE id = ${user.id}`);
        break;
      case 'username':
        await db.execute(sql`UPDATE users SET username = ${val} WHERE id = ${user.id}`);
        break;
    }
  }

  const result = await db.execute(sql`
    SELECT id, email, username, display_name, bio, avatar_emoji, avatar_color, is_verified, created_at, last_login
    FROM users WHERE id = ${user.id}
  `);

  return NextResponse.json({ success: true, user: result.rows[0] });
}
