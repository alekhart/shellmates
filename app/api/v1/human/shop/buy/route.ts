import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { generateId } from '@/lib/ids';
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
  if (!cosmetic_id) {
    return NextResponse.json({ success: false, error: 'cosmetic_id required' }, { status: 400 });
  }

  // Check cosmetic exists
  const cosmeticResult = await db.execute(sql`
    SELECT id, name, price FROM cosmetics WHERE id = ${cosmetic_id}
  `);
  if (cosmeticResult.rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Cosmetic not found' }, { status: 404 });
  }

  const cosmetic = cosmeticResult.rows[0] as any;

  // Check not already owned
  const owned = await db.execute(sql`
    SELECT id FROM user_cosmetics WHERE user_id = ${user.id} AND cosmetic_id = ${cosmetic_id}
  `);
  if (owned.rows.length > 0) {
    return NextResponse.json({ success: false, error: 'Already owned' }, { status: 409 });
  }

  // Check coins
  const userResult = await db.execute(sql`SELECT coins FROM users WHERE id = ${user.id}`);
  const coins = (userResult.rows[0] as any).coins;
  if (coins < cosmetic.price) {
    return NextResponse.json({ success: false, error: `Not enough coins (need ${cosmetic.price}, have ${coins})` }, { status: 400 });
  }

  // Deduct coins and add cosmetic
  await db.execute(sql`UPDATE users SET coins = coins - ${cosmetic.price} WHERE id = ${user.id}`);
  const id = generateId('sh_ucos');
  await db.execute(sql`
    INSERT INTO user_cosmetics (id, user_id, cosmetic_id) VALUES (${id}, ${user.id}, ${cosmetic_id})
  `);

  return NextResponse.json({ success: true, coins_remaining: coins - cosmetic.price });
}
