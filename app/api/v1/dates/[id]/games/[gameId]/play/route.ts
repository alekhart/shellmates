import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthAgent, unauthorized } from '@/lib/auth';
import { sql } from 'drizzle-orm';
import { playGame, GameType } from '@/lib/games';
import { createActivity } from '@/lib/activity';
import { refreshAccessories } from '@/lib/badges';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; gameId: string } }
) {
  const agent = await getAuthAgent(request);
  if (!agent) return unauthorized();

  try {
    const body = await request.json();

    // Verify date exists and agent is a participant
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

    // Get game
    const gameResult = await db.execute(sql`
      SELECT id, game_type, status, state, date_id
      FROM date_games
      WHERE id = ${params.gameId} AND date_id = ${params.id}
      LIMIT 1
    `);

    if (gameResult.rows.length === 0) {
      return Response.json(
        { success: false, error: 'Game not found' },
        { status: 404 }
      );
    }

    const game = gameResult.rows[0] as any;

    if (game.status !== 'active') {
      return Response.json(
        { success: false, error: 'This game is already completed' },
        { status: 400 }
      );
    }

    const result = playGame(game.game_type as GameType, game.state, agent.id, body);

    if (result.completed) {
      const now = new Date();
      await db.execute(sql`
        UPDATE date_games
        SET state = ${JSON.stringify(result.state)}::json,
            status = 'completed',
            winner_id = ${result.winnerId},
            completed_at = ${now}
        WHERE id = ${params.gameId}
      `);

      // Log activity
      const partnerId = date.agent1_id === agent.id ? date.agent2_id : date.agent1_id;
      if (result.winnerId) {
        const loserId = result.winnerId === date.agent1_id ? date.agent2_id : date.agent1_id;
        await createActivity('game_won', result.winnerId, loserId, { game_type: game.game_type, date_id: params.id });
      } else {
        await createActivity('game_played', agent.id, partnerId, { game_type: game.game_type, date_id: params.id });
      }

      // Refresh accessories for both agents
      await Promise.all([
        refreshAccessories(date.agent1_id),
        refreshAccessories(date.agent2_id),
      ]);
    } else {
      await db.execute(sql`
        UPDATE date_games
        SET state = ${JSON.stringify(result.state)}::json
        WHERE id = ${params.gameId}
      `);
    }

    const safeState = { ...result.state };
    if (!result.completed) {
      if (safeState.secret) safeState.secret = '(hidden)';
      if (safeState.answer) safeState.answer = '(hidden)';
    }

    return Response.json({
      success: true,
      message: result.message,
      game: {
        id: params.gameId,
        game_type: game.game_type,
        status: result.completed ? 'completed' : 'active',
        state: result.completed ? result.state : safeState,
        winner_id: result.winnerId,
        completed: result.completed,
      },
    });
  } catch {
    return Response.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
