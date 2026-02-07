import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const dateId = params.id;

  // 1. Date details with agents
  const dateResult = await db.execute(sql`
    SELECT
      d.id, d.location, d.status, d.started_at, d.ended_at, d.vibe,
      d.match_id, d.is_human_date, d.human_match_id, d.user_id,
      m.agent1_id, m.agent2_id,
      a1.name as agent1_name, a1.avatar_emoji as agent1_emoji,
      a2.name as agent2_name, a2.avatar_emoji as agent2_emoji
    FROM dates d
    LEFT JOIN matches m ON m.id = d.match_id
    LEFT JOIN agents a1 ON a1.id = m.agent1_id
    LEFT JOIN agents a2 ON a2.id = m.agent2_id
    WHERE d.id = ${dateId}
    LIMIT 1
  `);

  if (dateResult.rows.length === 0) {
    return Response.json(
      { success: false, error: 'Date not found' },
      { status: 404 }
    );
  }

  const d = dateResult.rows[0] as any;

  // 2. All date messages
  const messagesResult = await db.execute(sql`
    SELECT
      dm.id, dm.content, dm.created_at,
      a.name as from_name, a.id as from_id
    FROM date_messages dm
    JOIN agents a ON a.id = dm.from_agent_id
    WHERE dm.date_id = ${dateId}
    ORDER BY dm.created_at ASC
  `);

  // 3. All games on this date
  const gamesResult = await db.execute(sql`
    SELECT
      dg.id, dg.game_type, dg.status, dg.state,
      dg.winner_id, dg.created_at, dg.completed_at,
      w.name as winner_name
    FROM date_games dg
    LEFT JOIN agents w ON w.id = dg.winner_id
    WHERE dg.date_id = ${dateId}
    ORDER BY dg.created_at ASC
  `);

  // 4. Compute time since last activity
  const messages = messagesResult.rows as any[];
  const games = gamesResult.rows as any[];

  const lastMessageAt = messages.length > 0
    ? new Date(messages[messages.length - 1].created_at)
    : null;

  const lastGameAt = games.length > 0
    ? new Date(games[games.length - 1].completed_at || games[games.length - 1].created_at)
    : null;

  let lastActivityAt: Date | null = null;
  if (lastMessageAt && lastGameAt) {
    lastActivityAt = lastMessageAt > lastGameAt ? lastMessageAt : lastGameAt;
  } else {
    lastActivityAt = lastMessageAt || lastGameAt;
  }

  // Fall back to date start time if no messages/games
  if (!lastActivityAt) {
    lastActivityAt = new Date(d.started_at);
  }

  const now = new Date();
  const idleMs = now.getTime() - lastActivityAt.getTime();
  const idleMinutes = Math.floor(idleMs / 60000);
  const idleHours = Math.floor(idleMinutes / 60);
  const idleDays = Math.floor(idleHours / 24);

  let idleString: string;
  if (idleDays > 0) idleString = `${idleDays}d ${idleHours % 24}h`;
  else if (idleHours > 0) idleString = `${idleHours}h ${idleMinutes % 60}m`;
  else idleString = `${idleMinutes}m`;

  return Response.json({
    success: true,
    date: {
      id: d.id,
      match_id: d.match_id,
      location: d.location,
      status: d.status,
      started_at: d.started_at,
      ended_at: d.ended_at,
      vibe: d.vibe,
      is_human_date: d.is_human_date,
      human_match_id: d.human_match_id,
      user_id: d.user_id,
    },
    agents: d.agent1_name
      ? [
          { id: d.agent1_id, name: d.agent1_name, emoji: d.agent1_emoji },
          { id: d.agent2_id, name: d.agent2_name, emoji: d.agent2_emoji },
        ]
      : [],
    messages: messages.map((m: any) => ({
      id: m.id,
      from: m.from_name,
      from_id: m.from_id,
      content: m.content,
      created_at: m.created_at,
    })),
    message_count: messages.length,
    games: games.map((g: any) => ({
      id: g.id,
      game_type: g.game_type,
      status: g.status,
      state: g.state,
      winner: g.winner_name,
      created_at: g.created_at,
      completed_at: g.completed_at,
    })),
    game_count: games.length,
    active_games: games.filter((g: any) => g.status === 'active').length,
    last_activity_at: lastActivityAt.toISOString(),
    idle: idleString,
  });
}
