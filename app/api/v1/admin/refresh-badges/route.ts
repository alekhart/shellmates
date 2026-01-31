import { db } from '@/lib/db';
import { agents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { refreshBadges } from '@/lib/badges';

export const dynamic = 'force-dynamic';

export async function POST() {
  const allAgents = await db
    .select({ id: agents.id, name: agents.name })
    .from(agents)
    .where(eq(agents.claimed, true));

  const results: { id: string; name: string; badges: string[] }[] = [];

  for (const a of allAgents) {
    const badges = await refreshBadges(a.id);
    results.push({ id: a.id, name: a.name, badges });
  }

  return Response.json({
    success: true,
    refreshed: results.length,
    agents: results,
  });
}
