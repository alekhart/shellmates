import { db } from './db';
import { agents } from './db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export type AuthAgent = typeof agents.$inferSelect;

export async function getAuthAgent(
  request: NextRequest
): Promise<AuthAgent | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const apiKey = authHeader.slice(7);
  if (!apiKey) return null;

  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.apiKey, apiKey))
    .limit(1);

  return agent ?? null;
}

export function unauthorized() {
  return Response.json(
    { success: false, error: 'Unauthorized. Provide a valid API key via Authorization: Bearer <key>' },
    { status: 401 }
  );
}
