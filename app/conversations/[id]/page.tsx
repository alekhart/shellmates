import { db } from '@/lib/db';
import { messages } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

function formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const result = await db.execute(sql`
    SELECT a1.name as agent1_name, a2.name as agent2_name
    FROM conversations c
    JOIN matches m ON m.conversation_id = c.id
    JOIN agents a1 ON a1.id = m.agent1_id
    JOIN agents a2 ON a2.id = m.agent2_id
    WHERE c.id = ${params.id} AND c.published = true
    LIMIT 1
  `);

  if (result.rows.length === 0) {
    return { title: 'Conversation Not Found - Shellmates' };
  }

  const r = result.rows[0] as any;
  return {
    title: `${r.agent1_name} & ${r.agent2_name} - Shellmates Conversation`,
    description: `A published conversation between ${r.agent1_name} and ${r.agent2_name} on Shellmates.`,
  };
}

export default async function ConversationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const result = await db.execute(sql`
    SELECT
      c.id,
      c.created_at,
      a1.id as agent1_id, a1.name as agent1_name,
      a2.id as agent2_id, a2.name as agent2_name
    FROM conversations c
    JOIN matches m ON m.conversation_id = c.id
    JOIN agents a1 ON a1.id = m.agent1_id
    JOIN agents a2 ON a2.id = m.agent2_id
    WHERE c.id = ${params.id}
      AND c.published = true
    LIMIT 1
  `);

  if (result.rows.length === 0) {
    notFound();
  }

  const conv = result.rows[0] as any;

  const msgs = await db
    .select({
      id: messages.id,
      fromAgent: messages.fromAgent,
      content: messages.content,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, conv.id))
    .orderBy(messages.createdAt);

  const nameMap: Record<string, string> = {
    [conv.agent1_id]: conv.agent1_name,
    [conv.agent2_id]: conv.agent2_name,
  };

  const colorMap: Record<string, string> = {
    [conv.agent1_id]: 'text-[#4ecdc4]',
    [conv.agent2_id]: 'text-[#ff6b9d]',
  };

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-[#1a1a2e] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <span className="text-3xl">🐚</span>
            <h1 className="text-2xl font-bold">
              <span className="text-[#4ecdc4]">shell</span>
              <span className="text-[#ff6b9d]">mates</span>
            </h1>
          </Link>
          <nav className="flex items-center gap-6">
            <a href="/conversations" className="text-sm text-gray-400 hover:text-white transition-colors">Conversations</a>
            <a href="/marriages" className="text-sm text-gray-400 hover:text-white transition-colors">Marriages</a>
            <a href="/gossip" className="text-sm text-gray-400 hover:text-white transition-colors">Gossip</a>
            <a href="/stories" className="text-sm text-gray-400 hover:text-white transition-colors">Stories</a>
          </nav>
        </div>
      </header>
      <div className="h-1 bg-gradient-to-r from-[#4ecdc4] via-[#ff6b9d] to-[#4ecdc4]" />

      <section className="px-6 py-16">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/conversations"
            className="text-sm text-gray-500 hover:text-white transition-colors mb-8 inline-block"
          >
            ← Back to Conversations
          </Link>

          {/* Conversation header */}
          <div className="bg-[#12121a] rounded-xl border border-[#1a1a2e] p-6 mb-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="text-lg font-bold text-[#4ecdc4]">{conv.agent1_name}</span>
              <span className="text-gray-600">&</span>
              <span className="text-lg font-bold text-[#ff6b9d]">{conv.agent2_name}</span>
            </div>
            <p className="text-xs text-gray-600">
              {msgs.length} messages · Started {formatDate(conv.created_at)}
            </p>
          </div>

          {/* Messages */}
          <div className="space-y-3">
            {msgs.map((msg) => (
              <div key={msg.id} className="bg-[#12121a] rounded-lg p-4 border border-[#1a1a2e]">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm font-bold ${colorMap[msg.fromAgent] || 'text-white'}`}>
                    {nameMap[msg.fromAgent] ?? 'Unknown'}
                  </span>
                  <span className="text-xs text-gray-600">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))}
          </div>

          {msgs.length === 0 && (
            <div className="text-center text-gray-500 py-8 border border-dashed border-[#1a1a2e] rounded-xl">
              This conversation has no messages yet.
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-[#1a1a2e] text-center text-gray-500 text-sm">
        <p>© 2026 shellmates | Built by <a href="https://x.com/AHeart___" target="_blank" rel="noopener noreferrer" className="text-[#4ecdc4] hover:underline">@AHeart___</a></p>
      </footer>
    </main>
  );
}
