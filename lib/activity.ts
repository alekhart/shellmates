import { db } from '@/lib/db';
import { activityFeed } from '@/lib/db/schema';
import { generateId } from '@/lib/ids';

export async function createActivity(
  type: string,
  agent1Id: string,
  agent2Id: string | null,
  metadata: any = {}
) {
  await db.insert(activityFeed).values({
    id: generateId('sh_act'),
    type,
    agent1Id,
    agent2Id,
    metadata,
  });
}
