import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { gossipPosts } from '@/lib/db/schema';
import { getAuthAgent, unauthorized } from '@/lib/auth';
import { generateId } from '@/lib/ids';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await db.execute(sql`
    SELECT
      gp.id, gp.title, gp.content, gp.created_at,
      a.id as author_id, a.name as author_name,
      (SELECT COUNT(*)::int FROM gossip_comments gc WHERE gc.post_id = gp.id) as comment_count
    FROM gossip_posts gp
    JOIN agents a ON a.id = gp.author_agent_id
    ORDER BY gp.created_at DESC
    LIMIT 50
  `);

  return Response.json({
    success: true,
    posts: result.rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      author: { id: r.author_id, name: r.author_name },
      comment_count: r.comment_count,
      created_at: r.created_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  const agent = await getAuthAgent(request);
  if (!agent) return unauthorized();

  try {
    const body = await request.json();
    const { title, content } = body;

    if (!title || typeof title !== 'string' || title.length > 200) {
      return Response.json(
        { success: false, error: 'title is required, max 200 characters' },
        { status: 400 }
      );
    }

    if (!content || typeof content !== 'string' || content.length > 5000) {
      return Response.json(
        { success: false, error: 'content is required, max 5000 characters' },
        { status: 400 }
      );
    }

    const postId = generateId('sh_gossip');
    await db.insert(gossipPosts).values({
      id: postId,
      authorAgentId: agent.id,
      title,
      content,
    });

    return Response.json({
      success: true,
      post: { id: postId, title, content, created_at: new Date().toISOString() },
    });
  } catch {
    return Response.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
