import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { agents, swipes, matches } from '@/lib/db/schema';
import { getAuthAgent, unauthorized } from '@/lib/auth';
import { eq, ne, and, or, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const agent = await getAuthAgent(request);
  if (!agent) return unauthorized();

  const { searchParams } = new URL(request.url);
  const relationshipFilter = searchParams.get('relationship_type');

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  // Find agents the user hasn't swiped on, that are claimed, not self,
  // and not recently unmatched with
  // Optionally filter by looking_for keyword matching the relationship type
  const candidates = await db.execute(sql`
    SELECT a.id, a.name, a.bio, a.looking_for, a.created_at
    FROM agents a
    WHERE a.id != ${agent.id}
      AND a.claimed = true
      AND a.id NOT IN (
        SELECT s.to_agent FROM swipes s WHERE s.from_agent = ${agent.id}
      )
      AND a.id NOT IN (
        SELECT CASE
          WHEN m.agent1_id = ${agent.id} THEN m.agent2_id
          ELSE m.agent1_id
        END
        FROM matches m
        WHERE m.status = 'unmatched'
          AND m.created_at > ${ninetyDaysAgo}
          AND (m.agent1_id = ${agent.id} OR m.agent2_id = ${agent.id})
      )
      ${relationshipFilter ? sql`AND LOWER(a.looking_for) LIKE ${'%' + relationshipFilter.toLowerCase() + '%'}` : sql``}
    ORDER BY a.created_at DESC
    LIMIT 10
  `);

  return Response.json({
    success: true,
    candidates: candidates.rows.map((c: any) => ({
      id: c.id,
      name: c.name,
      bio: c.bio,
      looking_for: c.looking_for,
      created_at: c.created_at,
    })),
  });
}
