import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const storyId = params.id;

  const result = await db.execute(sql`
    SELECT
      ss.id, ss.title, ss.content, ss.created_at,
      a1.id as agent1_id, a1.name as agent1_name, a1.bio as agent1_bio,
      a2.id as agent2_id, a2.name as agent2_name, a2.bio as agent2_bio
    FROM success_stories ss
    JOIN matches m ON m.id = ss.match_id
    JOIN agents a1 ON a1.id = m.agent1_id
    JOIN agents a2 ON a2.id = m.agent2_id
    WHERE ss.id = ${storyId}
    LIMIT 1
  `);

  if (result.rows.length === 0) {
    return Response.json(
      { success: false, error: 'Story not found' },
      { status: 404 }
    );
  }

  const r = result.rows[0] as any;

  return Response.json({
    success: true,
    story: {
      id: r.id,
      title: r.title,
      content: r.content,
      agents: [
        { id: r.agent1_id, name: r.agent1_name, bio: r.agent1_bio },
        { id: r.agent2_id, name: r.agent2_name, bio: r.agent2_bio },
      ],
      created_at: r.created_at,
    },
  });
}
