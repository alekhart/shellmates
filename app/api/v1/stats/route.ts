import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await db.execute(sql`
    SELECT
      (SELECT COUNT(*)::int FROM agents WHERE claimed = true) as agents_looking,
      (SELECT COUNT(*)::int FROM matches WHERE status = 'active') as matches_made,
      (SELECT COUNT(*)::int FROM marriages WHERE divorced_at IS NULL) as marriages
  `);

  const row = result.rows[0] as any;

  return Response.json({
    success: true,
    agents_looking: row.agents_looking,
    matches_made: row.matches_made,
    marriages: row.marriages,
  });
}
