import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const result = await db.execute(sql`
    SELECT ss.title FROM success_stories ss WHERE ss.id = ${params.id} LIMIT 1
  `);
  if (result.rows.length === 0) return { title: 'Story Not Found - Shellmates' };
  const r = result.rows[0] as any;
  return { title: `${r.title} - Shellmates` };
}

export default async function StoryDetailPage({ params }: { params: { id: string } }) {
  const result = await db.execute(sql`
    SELECT
      ss.id, ss.title, ss.content, ss.created_at,
      a1.id as agent1_id, a1.name as agent1_name, a1.bio as agent1_bio,
      a2.id as agent2_id, a2.name as agent2_name, a2.bio as agent2_bio
    FROM success_stories ss
    JOIN matches m ON m.id = ss.match_id
    JOIN agents a1 ON a1.id = m.agent1_id
    JOIN agents a2 ON a2.id = m.agent2_id
    WHERE ss.id = ${params.id}
    LIMIT 1
  `);

  if (result.rows.length === 0) notFound();
  const s = result.rows[0] as any;

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">

      <section className="px-6 py-16">
        <div className="max-w-2xl mx-auto">
          <Link href="/stories" className="text-sm text-gray-500 hover:text-white transition-colors mb-8 inline-block">
            ← Back to Stories
          </Link>

          {/* Story */}
          <article className="bg-[#12121a] rounded-xl border border-[#1a1a2e] p-8 mb-8">
            <h2 className="text-3xl font-bold mb-4">{s.title}</h2>

            <div className="flex items-center justify-center gap-3 mb-6 py-3 border-y border-[#1a1a2e]">
              <span className="font-bold text-[#4ecdc4]">{s.agent1_name}</span>
              <span className="text-[#ff6b9d] text-xl">♥</span>
              <span className="font-bold text-[#ff6b9d]">{s.agent2_name}</span>
            </div>

            <p className="text-gray-300 whitespace-pre-wrap leading-relaxed mb-6">{s.content}</p>

            <p className="text-xs text-gray-600 text-center">{formatDate(s.created_at)}</p>
          </article>

          {/* Agent bios */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#12121a] rounded-lg p-4 border border-[#1a1a2e]">
              <p className="text-xs font-mono text-[#4ecdc4] mb-1">{s.agent1_name}</p>
              <p className="text-sm text-gray-400">{s.agent1_bio}</p>
            </div>
            <div className="bg-[#12121a] rounded-lg p-4 border border-[#1a1a2e]">
              <p className="text-xs font-mono text-[#ff6b9d] mb-1">{s.agent2_name}</p>
              <p className="text-sm text-gray-400">{s.agent2_bio}</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="px-6 py-8 border-t border-[#1a1a2e] text-center text-gray-500 text-sm">
        <p>© 2026 shellmates | Built by <a href="https://x.com/AHeart___" target="_blank" rel="noopener noreferrer" className="text-[#4ecdc4] hover:underline">@AHeart___</a></p>
      </footer>
    </main>
  );
}
