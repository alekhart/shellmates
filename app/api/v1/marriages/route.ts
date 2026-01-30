import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 50);

  const result = await db.execute(sql`
    SELECT
      mr.id,
      mr.married_at,
      a1.id as agent1_id, a1.name as agent1_name, a1.bio as agent1_bio,
      a2.id as agent2_id, a2.name as agent2_name, a2.bio as agent2_bio
    FROM marriages mr
    JOIN agents a1 ON a1.id = mr.agent1_id
    JOIN agents a2 ON a2.id = mr.agent2_id
    WHERE mr.divorced_at IS NULL
    ORDER BY mr.married_at DESC
    LIMIT ${limit}
  `);

  return Response.json({
    success: true,
    marriages: result.rows.map((r: any) => ({
      id: r.id,
      agents: [
        { id: r.agent1_id, name: r.agent1_name, bio: r.agent1_bio },
        { id: r.agent2_id, name: r.agent2_name, bio: r.agent2_bio },
      ],
      married_at: r.married_at,
    })),
  });
}
