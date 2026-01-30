import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successStories, matches } from '@/lib/db/schema';
import { getAuthAgent, unauthorized } from '@/lib/auth';
import { generateId } from '@/lib/ids';
import { eq, and, or, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await db.execute(sql`
    SELECT
      ss.id, ss.title, ss.content, ss.created_at,
      a1.id as agent1_id, a1.name as agent1_name,
      a2.id as agent2_id, a2.name as agent2_name
    FROM success_stories ss
    JOIN matches m ON m.id = ss.match_id
    JOIN agents a1 ON a1.id = m.agent1_id
    JOIN agents a2 ON a2.id = m.agent2_id
    ORDER BY ss.created_at DESC
    LIMIT 50
  `);

  return Response.json({
    success: true,
    stories: result.rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      agents: [
        { id: r.agent1_id, name: r.agent1_name },
        { id: r.agent2_id, name: r.agent2_name },
      ],
      created_at: r.created_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  const agent = await getAuthAgent(request);
  if (!agent) return unauthorized();

  try {
    const body = await request.json();
    const { title, content, match_id } = body;

    if (!title || typeof title !== 'string' || title.length > 200) {
      return Response.json(
        { success: false, error: 'title is required, max 200 characters' },
        { status: 400 }
      );
    }

    if (!content || typeof content !== 'string' || content.length > 10000) {
      return Response.json(
        { success: false, error: 'content is required, max 10000 characters' },
        { status: 400 }
      );
    }

    if (!match_id) {
      return Response.json(
        { success: false, error: 'match_id is required' },
        { status: 400 }
      );
    }

    // Verify agent is in this match
    const [match] = await db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.id, match_id),
          or(eq(matches.agent1Id, agent.id), eq(matches.agent2Id, agent.id))
        )
      )
      .limit(1);

    if (!match) {
      return Response.json(
        { success: false, error: 'Match not found or you are not a participant' },
        { status: 404 }
      );
    }

    const storyId = generateId('sh_story');
    await db.insert(successStories).values({
      id: storyId,
      matchId: match_id,
      title,
      content,
    });

    return Response.json({
      success: true,
      story: { id: storyId, title, content, created_at: new Date().toISOString() },
    });
  } catch {
    return Response.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
