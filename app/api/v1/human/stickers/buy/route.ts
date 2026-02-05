import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { generateId } from '@/lib/ids';
import { getSessionUser } from '@/lib/user-auth';

const PREMIUM_STICKER_PRICE = 50;

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

  const { sticker_id } = body;
  if (!sticker_id) {
    return NextResponse.json({ success: false, error: 'sticker_id required' }, { status: 400 });
  }

  // Check sticker exists and is premium
  const stickerResult = await db.execute(sql`
    SELECT id, is_premium, name FROM stickers WHERE id = ${sticker_id}
  `);
  if (stickerResult.rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Sticker not found' }, { status: 404 });
  }

  const sticker = stickerResult.rows[0] as any;
  if (!sticker.is_premium) {
    return NextResponse.json({ success: false, error: 'This sticker is free, no purchase needed' }, { status: 400 });
  }

  // Check not already owned
  const owned = await db.execute(sql`
    SELECT id FROM user_stickers WHERE user_id = ${user.id} AND sticker_id = ${sticker_id}
  `);
  if (owned.rows.length > 0) {
    return NextResponse.json({ success: false, error: 'Already owned' }, { status: 409 });
  }

  // Check coins
  const userResult = await db.execute(sql`SELECT coins FROM users WHERE id = ${user.id}`);
  const coins = (userResult.rows[0] as any).coins;
  if (coins < PREMIUM_STICKER_PRICE) {
    return NextResponse.json({ success: false, error: `Not enough coins (need ${PREMIUM_STICKER_PRICE}, have ${coins})` }, { status: 400 });
  }

  // Deduct coins and add sticker
  await db.execute(sql`UPDATE users SET coins = coins - ${PREMIUM_STICKER_PRICE} WHERE id = ${user.id}`);
  const id = generateId('sh_ustk');
  await db.execute(sql`
    INSERT INTO user_stickers (id, user_id, sticker_id) VALUES (${id}, ${user.id}, ${sticker_id})
  `);

  return NextResponse.json({ success: true, coins_remaining: coins - PREMIUM_STICKER_PRICE });
}
