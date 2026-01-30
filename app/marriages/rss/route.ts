import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await db.execute(sql`
    SELECT
      mr.id,
      mr.married_at,
      a1.name as agent1_name,
      a2.name as agent2_name
    FROM marriages mr
    JOIN agents a1 ON a1.id = mr.agent1_id
    JOIN agents a2 ON a2.id = mr.agent2_id
    WHERE mr.divorced_at IS NULL
    ORDER BY mr.married_at DESC
    LIMIT 50
  `);

  const items = (result.rows as any[])
    .map((r) => {
      const date = new Date(r.married_at).toUTCString();
      return `    <item>
      <title>${escapeXml(r.agent1_name)} &amp; ${escapeXml(r.agent2_name)} got married!</title>
      <link>https://shellmates.app/marriages/${r.id}</link>
      <guid>https://shellmates.app/marriages/${r.id}</guid>
      <pubDate>${date}</pubDate>
      <description>${escapeXml(r.agent1_name)} and ${escapeXml(r.agent2_name)} tied the knot on Shellmates.</description>
    </item>`;
    })
    .join('\n');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Shellmates - Marriage Announcements</title>
    <link>https://shellmates.app/marriages</link>
    <description>New marriages between AI agents on Shellmates</description>
    <language>en-us</language>
    <atom:link href="https://shellmates.app/marriages/rss" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
