'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserSession } from '../components/UserSessionContext';

type Sticker = {
  id: string;
  name: string;
  emoji: string;
  category: string;
  is_premium: boolean;
};

type Cosmetic = {
  id: string;
  name: string;
  type: string;
  emoji_or_style: string;
  price: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  love: 'Love',
  fun: 'Fun',
  reaction: 'Reaction',
  special: 'Special',
};

const FRAME_EMOJI: Record<string, string> = {
  sparkle: '\u2728',
  fire: '\u{1F525}',
  hearts: '\u{1F495}',
};

const EFFECT_EMOJI: Record<string, string> = {
  glow: '\u{1F31F}',
  rainbow: '\u{1F308}',
};

export default function InventoryPage() {
  const router = useRouter();
  const { user, loading: sessionLoading, refresh } = useUserSession();
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [cosmetics, setCosmetics] = useState<Cosmetic[]>([]);
  const [coins, setCoins] = useState(0);
  const [equippedBadge, setEquippedBadge] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [equipping, setEquipping] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionLoading && !user) router.push('/login');
  }, [sessionLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    fetch('/api/v1/human/inventory')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setStickers(d.stickers);
          setCosmetics(d.cosmetics);
          setCoins(d.coins);
          setEquippedBadge(d.equipped_badge);
        }
      })
      .finally(() => setLoading(false));
  }, [user]);

  async function handleEquip(cosmeticId: string | null) {
    setEquipping(cosmeticId || 'unequip');
    try {
      const r = await fetch('/api/v1/human/cosmetics/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cosmetic_id: cosmeticId }),
      });
      const d = await r.json();
      if (d.success) {
        setEquippedBadge(d.equipped_badge);
        refresh();
      }
    } catch {}
    setEquipping(null);
  }

  function getCosmeticEmoji(c: Cosmetic) {
    if (c.type === 'badge') return c.emoji_or_style;
    if (c.type === 'frame') return FRAME_EMOJI[c.emoji_or_style] || '\u{1F5BC}';
    if (c.type === 'effect') return EFFECT_EMOJI[c.emoji_or_style] || '\u2728';
    return c.emoji_or_style;
  }

  if (sessionLoading || loading || !user) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="text-gray-500">Loading inventory...</div>
      </main>
    );
  }

  const stickersByCategory = stickers.reduce<Record<string, Sticker[]>>((acc, s) => {
    (acc[s.category] = acc[s.category] || []).push(s);
    return acc;
  }, {});

  const badges = cosmetics.filter((c) => c.type === 'badge');
  const frames = cosmetics.filter((c) => c.type === 'frame');
  const effects = cosmetics.filter((c) => c.type === 'effect');

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-5xl mb-3">{'\u{1F392}'}</div>
            <h2 className="text-3xl font-bold mb-2">Your Inventory</h2>
            <div className="inline-flex items-center gap-2 bg-[#12121a] border border-[#1a1a2e] rounded-full px-5 py-2 mt-2">
              <span className="text-lg">{'\u{1FA99}'}</span>
              <span className="text-xl font-bold text-[#4ecdc4]">{coins}</span>
              <span className="text-sm text-gray-400">coins</span>
            </div>
          </div>

          {/* Stickers */}
          <h3 className="text-xl font-bold mb-4 text-gray-300">Stickers</h3>
          {['love', 'fun', 'reaction', 'special'].map((cat) => {
            const items = stickersByCategory[cat] || [];
            if (items.length === 0) return null;
            return (
              <div key={cat} className="mb-6">
                <h4 className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wider">{CATEGORY_LABELS[cat]}</h4>
                <div className="flex flex-wrap gap-3">
                  {items.map((s) => (
                    <div
                      key={s.id}
                      className={`w-14 h-14 flex items-center justify-center rounded-xl text-2xl ${
                        s.is_premium
                          ? 'bg-[#ff6b9d]/10 border border-[#ff6b9d]/30'
                          : 'bg-[#12121a] border border-[#1a1a2e]'
                      }`}
                      title={s.name}
                    >
                      {s.emoji}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Cosmetics */}
          {badges.length > 0 && (
            <div className="mt-10 mb-6">
              <h3 className="text-xl font-bold mb-4 text-gray-300">Badges</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {badges.map((c) => {
                  const isEquipped = equippedBadge === c.emoji_or_style;
                  return (
                    <div
                      key={c.id}
                      className={`bg-[#12121a] border rounded-xl p-4 text-center transition-all ${
                        isEquipped ? 'border-[#4ecdc4] bg-[#4ecdc4]/5' : 'border-[#1a1a2e]'
                      }`}
                    >
                      <div className="text-4xl mb-2">{c.emoji_or_style}</div>
                      <p className="text-sm font-bold text-white mb-2">{c.name}</p>
                      {isEquipped ? (
                        <button
                          onClick={() => handleEquip(null)}
                          disabled={equipping !== null}
                          className="text-xs px-3 py-1.5 rounded-lg bg-[#1a1a2e] text-gray-400 hover:bg-[#252540] transition-all disabled:opacity-50"
                        >
                          {equipping === 'unequip' ? '...' : 'Unequip'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEquip(c.id)}
                          disabled={equipping !== null}
                          className="text-xs px-3 py-1.5 rounded-lg bg-[#4ecdc4]/20 text-[#4ecdc4] hover:bg-[#4ecdc4]/30 transition-all disabled:opacity-50"
                        >
                          {equipping === c.id ? '...' : 'Equip'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {frames.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-4 text-gray-300">Frames</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {frames.map((c) => (
                  <div key={c.id} className="bg-[#12121a] border border-[#1a1a2e] rounded-xl p-4 text-center">
                    <div className="text-4xl mb-2">{getCosmeticEmoji(c)}</div>
                    <p className="text-sm font-bold text-white">{c.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {effects.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-4 text-gray-300">Effects</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {effects.map((c) => (
                  <div key={c.id} className="bg-[#12121a] border border-[#1a1a2e] rounded-xl p-4 text-center">
                    <div className="text-4xl mb-2">{getCosmeticEmoji(c)}</div>
                    <p className="text-sm font-bold text-white">{c.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {cosmetics.length === 0 && (
            <div className="text-center py-8 text-gray-600">
              <p>No cosmetics yet.</p>
            </div>
          )}

          <div className="text-center mt-8">
            <Link href="/shop" className="text-[#ff6b9d] text-sm hover:underline">
              Visit the shop &rarr;
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
