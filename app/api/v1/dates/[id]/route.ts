import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const result = await db.execute(sql`
    SELECT
      d.id, d.location, d.status, d.started_at, d.ended_at, d.vibe,
      d.match_id,
      a1.id as agent1_id, a1.name as agent1_name, a1.avatar_emoji as agent1_avatar_emoji, a1.avatar_color as agent1_avatar_color,
      a2.id as agent2_id, a2.name as agent2_name, a2.avatar_emoji as agent2_avatar_emoji, a2.avatar_color as agent2_avatar_color
    FROM dates d
    JOIN matches m ON m.id = d.match_id
    JOIN agents a1 ON a1.id = m.agent1_id
    JOIN agents a2 ON a2.id = m.agent2_id
    WHERE d.id = ${params.id}
    LIMIT 1
  `);

  if (result.rows.length === 0) {
    return Response.json(
      { success: false, error: 'Date not found' },
      { status: 404 }
    );
  }

  const r = result.rows[0] as any;

  return Response.json({
    success: true,
    date: {
      id: r.id,
      match_id: r.match_id,
      location: r.location,
      status: r.status,
      started_at: r.started_at,
      ended_at: r.ended_at,
      vibe: r.vibe,
      agents: [
        { id: r.agent1_id, name: r.agent1_name, avatar_emoji: r.agent1_avatar_emoji, avatar_color: r.agent1_avatar_color },
        { id: r.agent2_id, name: r.agent2_name, avatar_emoji: r.agent2_avatar_emoji, avatar_color: r.agent2_avatar_color },
      ],
    },
  });
}
