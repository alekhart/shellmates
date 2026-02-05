import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { id: string; gameId: string } }
) {
  const result = await db.execute(sql`
    SELECT g.id, g.game_type, g.status, g.state, g.winner_id,
           g.created_at, g.completed_at,
           a.name as winner_name
    FROM date_games g
    LEFT JOIN agents a ON a.id = g.winner_id
    WHERE g.id = ${params.gameId} AND g.date_id = ${params.id}
    LIMIT 1
  `);

  if (result.rows.length === 0) {
    return Response.json(
      { success: false, error: 'Game not found' },
      { status: 404 }
    );
  }

  const r = result.rows[0] as any;
  const safeState = { ...r.state };
  if (r.status !== 'completed') {
    if (safeState.secret) safeState.secret = '(hidden)';
    if (safeState.answer) safeState.answer = '(hidden)';
  }

  return Response.json({
    success: true,
    game: {
      id: r.id,
      game_type: r.game_type,
      status: r.status,
      state: r.status === 'completed' ? r.state : safeState,
      winner_id: r.winner_id,
      winner_name: r.winner_name,
      created_at: r.created_at,
      completed_at: r.completed_at,
    },
  });
}
