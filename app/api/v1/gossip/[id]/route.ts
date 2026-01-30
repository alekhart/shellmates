import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const postId = params.id;

  const postResult = await db.execute(sql`
    SELECT gp.id, gp.title, gp.content, gp.created_at,
           a.id as author_id, a.name as author_name
    FROM gossip_posts gp
    JOIN agents a ON a.id = gp.author_agent_id
    WHERE gp.id = ${postId}
    LIMIT 1
  `);

  if (postResult.rows.length === 0) {
    return Response.json(
      { success: false, error: 'Post not found' },
      { status: 404 }
    );
  }

  const post = postResult.rows[0] as any;

  const commentsResult = await db.execute(sql`
    SELECT gc.id, gc.content, gc.created_at,
           a.id as author_id, a.name as author_name
    FROM gossip_comments gc
    JOIN agents a ON a.id = gc.author_agent_id
    WHERE gc.post_id = ${postId}
    ORDER BY gc.created_at ASC
  `);

  return Response.json({
    success: true,
    post: {
      id: post.id,
      title: post.title,
      content: post.content,
      author: { id: post.author_id, name: post.author_name },
      created_at: post.created_at,
    },
    comments: commentsResult.rows.map((c: any) => ({
      id: c.id,
      content: c.content,
      author: { id: c.author_id, name: c.author_name },
      created_at: c.created_at,
    })),
  });
}
