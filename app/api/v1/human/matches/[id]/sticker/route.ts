import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { generateId } from '@/lib/ids';
import { getSessionUser } from '@/lib/user-auth';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const rl = checkRateLimit(`sticker:${user.id}`, 30, 60000);
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: 'Too many stickers' }, { status: 429 });
  }

  // Verify match ownership
  const matchResult = await db.execute(sql`
    SELECT id FROM human_matches WHERE id = ${params.id} AND user_id = ${user.id}
  `);
  if (matchResult.rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { sticker_id } = body;
  if (!sticker_id) {
    return NextResponse.json({ success: false, error: 'sticker_id required' }, { status: 400 });
  }

  // Verify sticker exists
  const stickerResult = await db.execute(sql`
    SELECT id, emoji, name, is_premium FROM stickers WHERE id = ${sticker_id}
  `);
  if (stickerResult.rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Sticker not found' }, { status: 404 });
  }

  const sticker = stickerResult.rows[0] as any;

  // If premium, verify ownership
  if (sticker.is_premium) {
    const owned = await db.execute(sql`
      SELECT id FROM user_stickers WHERE user_id = ${user.id} AND sticker_id = ${sticker_id}
    `);
    if (owned.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'You don\'t own this sticker' }, { status: 403 });
    }
  }

  const msgId = generateId('sh_smsg');
  await db.execute(sql`
    INSERT INTO sticker_messages (id, match_id, from_user_id, sticker_id)
    VALUES (${msgId}, ${params.id}, ${user.id}, ${sticker_id})
  `);

  return NextResponse.json({
    success: true,
    sticker_message: { id: msgId, sticker_id, emoji: sticker.emoji, name: sticker.name },
  });
}
