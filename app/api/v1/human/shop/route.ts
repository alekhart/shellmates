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

  const cosmeticsResult = await db.execute(sql`
    SELECT c.id, c.name, c.type, c.emoji_or_style, c.price, c.is_premium,
      CASE WHEN uc.id IS NOT NULL THEN true ELSE false END as owned
    FROM cosmetics c
    LEFT JOIN user_cosmetics uc ON uc.cosmetic_id = c.id AND uc.user_id = ${user.id}
    ORDER BY c.type, c.price
  `);

  const userResult = await db.execute(sql`SELECT coins FROM users WHERE id = ${user.id}`);
  const coins = (userResult.rows[0] as any).coins;

  return NextResponse.json({
    success: true,
    cosmetics: cosmeticsResult.rows,
    coins,
  });
}
