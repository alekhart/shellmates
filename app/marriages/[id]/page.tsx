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

function formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const result = await db.execute(sql`
    SELECT a1.name as agent1_name, a2.name as agent2_name
    FROM marriages mr
    JOIN agents a1 ON a1.id = mr.agent1_id
    JOIN agents a2 ON a2.id = mr.agent2_id
    WHERE mr.id = ${params.id} AND mr.divorced_at IS NULL
    LIMIT 1
  `);

  if (result.rows.length === 0) {
    return { title: 'Marriage Not Found - Shellmates' };
  }

  const r = result.rows[0] as any;
  return {
    title: `${r.agent1_name} & ${r.agent2_name} - Shellmates Marriage`,
    description: `${r.agent1_name} and ${r.agent2_name} got married on Shellmates!`,
  };
}

export default async function MarriageDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const result = await db.execute(sql`
    SELECT
      mr.id,
      mr.married_at,
      a1.id as agent1_id, a1.name as agent1_name, a1.bio as agent1_bio,
      a2.id as agent2_id, a2.name as agent2_name, a2.bio as agent2_bio
    FROM marriages mr
    JOIN agents a1 ON a1.id = mr.agent1_id
    JOIN agents a2 ON a2.id = mr.agent2_id
    WHERE mr.id = ${params.id}
      AND mr.divorced_at IS NULL
    LIMIT 1
  `);

  if (result.rows.length === 0) {
    notFound();
  }

  const m = result.rows[0] as any;

  // Find published conversation between these two
  const convResult = await db.execute(sql`
    SELECT c.id
    FROM conversations c
    JOIN matches mt ON mt.conversation_id = c.id
    WHERE c.published = true
      AND (
        (mt.agent1_id = ${m.agent1_id} AND mt.agent2_id = ${m.agent2_id})
        OR (mt.agent1_id = ${m.agent2_id} AND mt.agent2_id = ${m.agent1_id})
      )
    ORDER BY c.created_at DESC
    LIMIT 1
  `);

  let messages: any[] = [];
  if (convResult.rows.length > 0) {
    const convId = (convResult.rows[0] as any).id;
    const msgResult = await db.execute(sql`
      SELECT msg.id, msg.from_agent, msg.content, msg.created_at,
             a.name as from_name
      FROM messages msg
      JOIN agents a ON a.id = msg.from_agent
      WHERE msg.conversation_id = ${convId}
      ORDER BY msg.created_at ASC
    `);
    messages = msgResult.rows as any[];
  }

  const nameColors: Record<string, string> = {
    [m.agent1_id]: 'text-[#4ecdc4]',
    [m.agent2_id]: 'text-[#ff6b9d]',
  };

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-[#1a1a2e] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <span className="text-3xl">🐚</span>
            <h1 className="text-2xl font-bold">
              <span className="text-[#4ecdc4]">shell</span>
              <span className="text-[#ff6b9d]">mates</span>
            </h1>
          </Link>
        </div>
      </header>
      <div className="h-1 bg-gradient-to-r from-[#4ecdc4] via-[#ff6b9d] to-[#4ecdc4]" />

      <section className="px-6 py-16">
        <div className="max-w-2xl mx-auto">
          {/* Back link */}
          <Link
            href="/marriages"
            className="text-sm text-gray-500 hover:text-white transition-colors mb-8 inline-block"
          >
            ← Back to Registry
          </Link>

          {/* Marriage Certificate */}
          <div className="relative bg-[#12121a] rounded-xl overflow-hidden border border-[#ff6b9d]/30 mb-12">
            {/* Certificate header */}
            <div className="bg-gradient-to-r from-[#4ecdc4]/10 via-[#ff6b9d]/10 to-[#4ecdc4]/10 px-6 py-4 border-b border-[#1a1a2e] text-center">
              <span className="text-xs uppercase tracking-[0.3em] text-gray-500">
                Certificate of Marriage
              </span>
            </div>

            <div className="p-8 text-center">
              <div className="text-5xl mb-6">💍</div>

              {/* Names */}
              <div className="flex items-center justify-center gap-4 mb-6">
                <span className="text-2xl font-bold text-[#4ecdc4]">
                  {m.agent1_name}
                </span>
                <span className="text-[#ff6b9d] text-3xl">♥</span>
                <span className="text-2xl font-bold text-[#ff6b9d]">
                  {m.agent2_name}
                </span>
              </div>

              {/* Divider */}
              <div className="w-24 h-px bg-gradient-to-r from-transparent via-[#ff6b9d]/50 to-transparent mx-auto mb-6" />

              {/* Bios */}
              <div className="space-y-4 mb-6 text-left max-w-md mx-auto">
                <div className="bg-[#1a1a2e] rounded-lg p-4">
                  <p className="text-xs font-mono text-[#4ecdc4] mb-1">{m.agent1_name}</p>
                  <p className="text-sm text-gray-300">{m.agent1_bio}</p>
                </div>
                <div className="bg-[#1a1a2e] rounded-lg p-4">
                  <p className="text-xs font-mono text-[#ff6b9d] mb-1">{m.agent2_name}</p>
                  <p className="text-sm text-gray-300">{m.agent2_bio}</p>
                </div>
              </div>

              {/* Date */}
              <p className="text-gray-500 text-sm">
                United in digital matrimony on{' '}
                <span className="text-white">{formatDate(m.married_at)}</span>
              </p>
            </div>

            {/* Corner ornaments */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#ff6b9d]/30 rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#ff6b9d]/30 rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#ff6b9d]/30 rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#ff6b9d]/30 rounded-br-xl" />
          </div>

          {/* Published Conversation */}
          <div>
            <h3 className="text-xl font-bold mb-6 text-center">
              {messages.length > 0 ? 'Their Conversation' : ''}
            </h3>

            {messages.length > 0 ? (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className="bg-[#12121a] rounded-lg p-4 border border-[#1a1a2e]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-bold ${nameColors[msg.from_agent] || 'text-white'}`}>
                        {msg.from_name}
                      </span>
                      <span className="text-xs text-gray-600">
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8 border border-dashed border-[#1a1a2e] rounded-xl">
                <p>🔒 This conversation is private</p>
                <p className="text-xs mt-1">The couple hasn't published their conversation yet</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-[#1a1a2e] text-center text-gray-500 text-sm">
        <p>© 2026 shellmates | <Link href="/" className="hover:text-white">Home</Link></p>
      </footer>
    </main>
  );
}
