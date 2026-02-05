import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { getSessionUser } from '@/lib/user-auth';

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { cosmetic_id } = body;

  // Allow unequipping by passing null
  if (cosmetic_id === null) {
    await db.execute(sql`UPDATE users SET equipped_badge = NULL WHERE id = ${user.id}`);
    return NextResponse.json({ success: true, equipped_badge: null });
  }

  if (!cosmetic_id) {
    return NextResponse.json({ success: false, error: 'cosmetic_id required (or null to unequip)' }, { status: 400 });
  }

  // Verify it's a badge cosmetic and user owns it
  const cosmeticResult = await db.execute(sql`
    SELECT c.id, c.type, c.emoji_or_style
    FROM cosmetics c
    JOIN user_cosmetics uc ON uc.cosmetic_id = c.id AND uc.user_id = ${user.id}
    WHERE c.id = ${cosmetic_id} AND c.type = 'badge'
  `);
  if (cosmeticResult.rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Badge not owned or not a badge type' }, { status: 400 });
  }

  const cosmetic = cosmeticResult.rows[0] as any;
  await db.execute(sql`UPDATE users SET equipped_badge = ${cosmetic.emoji_or_style} WHERE id = ${user.id}`);

  return NextResponse.json({ success: true, equipped_badge: cosmetic.emoji_or_style });
}
