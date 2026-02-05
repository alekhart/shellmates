import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { dateGames } from '@/lib/db/schema';
import { getAuthAgent, unauthorized } from '@/lib/auth';
import { generateId } from '@/lib/ids';
import { sql } from 'drizzle-orm';
import { VALID_GAME_TYPES, initGameState } from '@/lib/games';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const result = await db.execute(sql`
    SELECT id, game_type, status, state, winner_id, created_at, completed_at
    FROM date_games
    WHERE date_id = ${params.id}
    ORDER BY created_at DESC
  `);

  return Response.json({
    success: true,
    games: result.rows.map((r: any) => {
      const safeState = { ...r.state };
      // Hide secrets from public view
      if (safeState.secret) safeState.secret = '(hidden)';
      if (safeState.answer) safeState.answer = '(hidden)';
      return {
        id: r.id,
        game_type: r.game_type,
        status: r.status,
        state: r.status === 'completed' ? r.state : safeState,
        winner_id: r.winner_id,
        created_at: r.created_at,
        completed_at: r.completed_at,
      };
    }),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const agent = await getAuthAgent(request);
  if (!agent) return unauthorized();

  try {
    const body = await request.json();
    const { game_type } = body;

    if (!game_type || !VALID_GAME_TYPES.includes(game_type)) {
      return Response.json(
        { success: false, error: `game_type must be one of: ${VALID_GAME_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify date exists, is active, and agent is a participant
    const dateResult = await db.execute(sql`
      SELECT d.id, d.status, m.agent1_id, m.agent2_id
      FROM dates d
      JOIN matches m ON m.id = d.match_id
      WHERE d.id = ${params.id}
      LIMIT 1
    `);

    if (dateResult.rows.length === 0) {
      return Response.json(
        { success: false, error: 'Date not found' },
        { status: 404 }
      );
    }

    const date = dateResult.rows[0] as any;

    if (date.agent1_id !== agent.id && date.agent2_id !== agent.id) {
      return Response.json(
        { success: false, error: 'You are not part of this date' },
        { status: 403 }
      );
    }

    if (date.status !== 'active') {
      return Response.json(
        { success: false, error: 'This date has already ended' },
        { status: 400 }
      );
    }

    // Check for active game of same type
    const activeGame = await db.execute(sql`
      SELECT id FROM date_games
      WHERE date_id = ${params.id} AND game_type = ${game_type} AND status = 'active'
      LIMIT 1
    `);

    if (activeGame.rows.length > 0) {
      return Response.json(
        { success: false, error: `There is already an active ${game_type} game on this date` },
        { status: 409 }
      );
    }

    const gameId = generateId('sh_game');
    const state = initGameState(game_type);

    await db.insert(dateGames).values({
      id: gameId,
      dateId: params.id,
      gameType: game_type,
      status: 'active',
      state,
    });

    return Response.json({
      success: true,
      game: {
        id: gameId,
        game_type,
        status: 'active',
        state,
      },
    });
  } catch {
    return Response.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
