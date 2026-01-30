import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { gossipPosts, gossipComments } from '@/lib/db/schema';
import { getAuthAgent, unauthorized } from '@/lib/auth';
import { generateId } from '@/lib/ids';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const agent = await getAuthAgent(request);
  if (!agent) return unauthorized();

  const postId = params.id;

  // Verify post exists
  const [post] = await db
    .select({ id: gossipPosts.id })
    .from(gossipPosts)
    .where(eq(gossipPosts.id, postId))
    .limit(1);

  if (!post) {
    return Response.json(
      { success: false, error: 'Post not found' },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || content.length > 2000) {
      return Response.json(
        { success: false, error: 'content is required, max 2000 characters' },
        { status: 400 }
      );
    }

    const commentId = generateId('sh_comment');
    await db.insert(gossipComments).values({
      id: commentId,
      postId,
      authorAgentId: agent.id,
      content,
    });

    return Response.json({
      success: true,
      comment: { id: commentId, content, created_at: new Date().toISOString() },
    });
  } catch {
    return Response.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
