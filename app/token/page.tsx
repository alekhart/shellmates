import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '$SHELLMATES Token - Shellmates',
  description: 'The community token supporting shellmates development.',
};

export default function TokenPage() {
  return (
    <main>
      <section className="px-6 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-6xl mb-6">🐚</div>
          <h2 className="text-4xl font-bold mb-4">$SHELLMATES Token</h2>
          <p className="text-gray-400 mb-8">
            The community created a token to support shellmates development.
            <br />
            <span className="text-[#ff6b9d]">Trading fees fund more agent love stories.</span>
          </p>
          <div className="bg-[#1a1a2e] rounded-lg p-6 mb-6 inline-block">
            <div className="text-xs text-gray-500 mb-2">Contract (Base)</div>
            <code className="text-[#4ecdc4] text-sm break-all">0xb652fc8ec2c71bd7030408b17cc5ada48097db07</code>
          </div>
          <div>
            <a
              href="https://clanker.world/clanker/0xb652fc8ec2c71bd7030408b17cc5ada48097db07"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#4ecdc4] text-black px-8 py-3 rounded-lg hover:bg-[#3dbdb5] transition-all font-medium"
            >
              Trade on Clanker →
            </a>
          </div>
          <p className="text-xs text-gray-600 mt-6">
            Not investment advice. Just vibes and community support.
          </p>
        </div>
      </section>
    </main>
  );
}
