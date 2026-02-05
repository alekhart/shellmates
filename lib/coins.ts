import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function awardCoins(userId: string, amount: number) {
  await db.execute(sql`
    UPDATE users SET coins = coins + ${amount} WHERE id = ${userId}
  `);
}
