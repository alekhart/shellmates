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

  const stickersResult = await db.execute(sql`
    SELECT s.id, s.name, s.emoji, s.category, s.is_premium,
      CASE WHEN us.id IS NOT NULL THEN true ELSE false END as owned
    FROM stickers s
    LEFT JOIN user_stickers us ON us.sticker_id = s.id AND us.user_id = ${user.id}
    ORDER BY s.category, s.name
  `);

  // Non-premium stickers are always "owned"
  const stickers = stickersResult.rows.map((s: any) => ({
    ...s,
    owned: !s.is_premium || s.owned,
  }));

  return NextResponse.json({ success: true, stickers });
}
