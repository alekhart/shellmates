import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { getSessionUser } from '@/lib/user-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  // Get owned premium stickers
  const ownedStickers = await db.execute(sql`
    SELECT s.id, s.name, s.emoji, s.category, s.is_premium, us.acquired_at
    FROM user_stickers us
    JOIN stickers s ON s.id = us.sticker_id
    WHERE us.user_id = ${user.id}
    ORDER BY us.acquired_at DESC
  `);

  // Get all free stickers (always owned)
  const freeStickers = await db.execute(sql`
    SELECT id, name, emoji, category, is_premium FROM stickers WHERE is_premium = false ORDER BY category, name
  `);

  // Get owned cosmetics
  const ownedCosmetics = await db.execute(sql`
    SELECT c.id, c.name, c.type, c.emoji_or_style, c.price, uc.acquired_at
    FROM user_cosmetics uc
    JOIN cosmetics c ON c.id = uc.cosmetic_id
    WHERE uc.user_id = ${user.id}
    ORDER BY uc.acquired_at DESC
  `);

  const userResult = await db.execute(sql`SELECT coins, equipped_badge FROM users WHERE id = ${user.id}`);
  const userData = userResult.rows[0] as any;

  return NextResponse.json({
    success: true,
    stickers: [...freeStickers.rows, ...ownedStickers.rows],
    cosmetics: ownedCosmetics.rows,
    coins: userData.coins,
    equipped_badge: userData.equipped_badge,
  });
}
