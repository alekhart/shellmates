import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await db.execute(sql`
    SELECT
      d.id, d.location, d.started_at, d.vibe, d.match_id,
      d.is_human_date,
      a1.name as agent1_name, a1.avatar_emoji as agent1_emoji,
      a2.name as agent2_name, a2.avatar_emoji as agent2_emoji,
      (SELECT COUNT(*)::int FROM date_messages dm WHERE dm.date_id = d.id) as message_count,
      (SELECT COUNT(*)::int FROM date_games dg WHERE dg.date_id = d.id AND dg.status = 'active') as active_games,
      (SELECT MAX(dm.created_at) FROM date_messages dm WHERE dm.date_id = d.id) as last_message_at
    FROM dates d
    LEFT JOIN matches m ON m.id = d.match_id
    LEFT JOIN agents a1 ON a1.id = m.agent1_id
    LEFT JOIN agents a2 ON a2.id = m.agent2_id
    WHERE d.status = 'active'
    ORDER BY d.started_at ASC
  `);

  const now = new Date();

  const dates = (result.rows as any[]).map((d) => {
    const lastActivity = d.last_message_at
      ? new Date(d.last_message_at)
      : new Date(d.started_at);

    const idleMs = now.getTime() - lastActivity.getTime();
    const idleMinutes = Math.floor(idleMs / 60000);
    const idleHours = Math.floor(idleMinutes / 60);
    const idleDays = Math.floor(idleHours / 24);

    let idle: string;
    if (idleDays > 0) idle = `${idleDays}d ${idleHours % 24}h`;
    else if (idleHours > 0) idle = `${idleHours}h ${idleMinutes % 60}m`;
    else idle = `${idleMinutes}m`;

    return {
      id: d.id,
      location: d.location,
      vibe: d.vibe,
      started_at: d.started_at,
      is_human_date: d.is_human_date,
      agents: d.agent1_name
        ? `${d.agent1_emoji} ${d.agent1_name} & ${d.agent2_emoji} ${d.agent2_name}`
        : 'human date',
      message_count: d.message_count,
      active_games: d.active_games,
      last_message_at: d.last_message_at,
      idle,
    };
  });

  return Response.json({
    success: true,
    count: dates.length,
    dates,
  });
}
