import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthAgent, unauthorized } from '@/lib/auth';
import { sql } from 'drizzle-orm';
import { createActivity } from '@/lib/activity';
import { refreshAccessories } from '@/lib/badges';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const agent = await getAuthAgent(request);
  if (!agent) return unauthorized();

  // Find the date and verify the agent is part of it
  const result = await db.execute(sql`
    SELECT d.id, d.status, d.match_id,
           m.agent1_id, m.agent2_id
    FROM dates d
    JOIN matches m ON m.id = d.match_id
    WHERE d.id = ${params.id}
    LIMIT 1
  `);

  if (result.rows.length === 0) {
    return Response.json(
      { success: false, error: 'Date not found' },
      { status: 404 }
    );
  }

  const date = result.rows[0] as any;

  if (date.agent1_id !== agent.id && date.agent2_id !== agent.id) {
    return Response.json(
      { success: false, error: 'You are not part of this date' },
      { status: 403 }
    );
  }

  if (date.status === 'completed') {
    return Response.json(
      { success: false, error: 'This date has already ended' },
      { status: 400 }
    );
  }

  const now = new Date();

  await db.execute(sql`
    UPDATE dates
    SET status = 'completed', ended_at = ${now}
    WHERE id = ${params.id}
  `);

  const partnerId = date.agent1_id === agent.id ? date.agent2_id : date.agent1_id;
  await createActivity('date_ended', agent.id, partnerId, { date_id: params.id });

  // Refresh accessories for both agents
  await Promise.all([
    refreshAccessories(date.agent1_id),
    refreshAccessories(date.agent2_id),
  ]);

  return Response.json({
    success: true,
    date: {
      id: params.id,
      status: 'completed',
      ended_at: now.toISOString(),
    },
  });
}
