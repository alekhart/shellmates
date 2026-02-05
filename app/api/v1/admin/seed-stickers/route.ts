import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { generateId } from '@/lib/ids';

const STICKERS = [
  // Love
  { name: 'Two Hearts', emoji: '\u{1F495}', category: 'love', is_premium: false },
  { name: 'Heart Eyes', emoji: '\u{1F60D}', category: 'love', is_premium: false },
  { name: 'Smiling Hearts', emoji: '\u{1F970}', category: 'love', is_premium: false },
  { name: 'Kiss', emoji: '\u{1F48B}', category: 'love', is_premium: false },
  { name: 'Cupid Arrow', emoji: '\u{1F498}', category: 'love', is_premium: false },
  { name: 'Gift Heart', emoji: '\u{1F49D}', category: 'love', is_premium: false },
  // Fun
  { name: 'Laughing', emoji: '\u{1F602}', category: 'fun', is_premium: false },
  { name: 'Party', emoji: '\u{1F389}', category: 'fun', is_premium: false },
  { name: 'Fire', emoji: '\u{1F525}', category: 'fun', is_premium: false },
  { name: 'Sparkles', emoji: '\u2728', category: 'fun', is_premium: false },
  { name: 'Star', emoji: '\u{1F31F}', category: 'fun', is_premium: false },
  { name: 'Dizzy', emoji: '\u{1F4AB}', category: 'fun', is_premium: false },
  // Reaction
  { name: 'Thumbs Up', emoji: '\u{1F44D}', category: 'reaction', is_premium: false },
  { name: 'Thumbs Down', emoji: '\u{1F44E}', category: 'reaction', is_premium: false },
  { name: 'Wow', emoji: '\u{1F62E}', category: 'reaction', is_premium: false },
  { name: 'Thinking', emoji: '\u{1F914}', category: 'reaction', is_premium: false },
  { name: 'Crying', emoji: '\u{1F622}', category: 'reaction', is_premium: false },
  { name: 'Angry', emoji: '\u{1F621}', category: 'reaction', is_premium: false },
  // Special (premium)
  { name: 'Diamond', emoji: '\u{1F48E}', category: 'special', is_premium: true },
  { name: 'Crown', emoji: '\u{1F451}', category: 'special', is_premium: true },
  { name: 'Unicorn', emoji: '\u{1F984}', category: 'special', is_premium: true },
  { name: 'Rainbow', emoji: '\u{1F308}', category: 'special', is_premium: true },
  { name: 'Masks', emoji: '\u{1F3AD}', category: 'special', is_premium: true },
  { name: 'Trophy', emoji: '\u{1F3C6}', category: 'special', is_premium: true },
];

const COSMETICS = [
  // Badges
  { name: 'Star Badge', type: 'badge', emoji_or_style: '\u{1F31F}', price: 50 },
  { name: 'Diamond Badge', type: 'badge', emoji_or_style: '\u{1F48E}', price: 100 },
  { name: 'Crown Badge', type: 'badge', emoji_or_style: '\u{1F451}', price: 200 },
  { name: 'Mystic Badge', type: 'badge', emoji_or_style: '\u{1F52E}', price: 150 },
  // Frames
  { name: 'Sparkle Frame', type: 'frame', emoji_or_style: 'sparkle', price: 75 },
  { name: 'Fire Frame', type: 'frame', emoji_or_style: 'fire', price: 100 },
  { name: 'Hearts Frame', type: 'frame', emoji_or_style: 'hearts', price: 50 },
  // Effects
  { name: 'Glowing Name', type: 'effect', emoji_or_style: 'glow', price: 100 },
  { name: 'Rainbow Name', type: 'effect', emoji_or_style: 'rainbow', price: 150 },
];

export async function POST() {
  // Check if already seeded
  const existing = await db.execute(sql`SELECT COUNT(*) as count FROM stickers`);
  if (Number((existing.rows[0] as any).count) > 0) {
    return NextResponse.json({ success: true, message: 'Already seeded' });
  }

  // Insert stickers
  for (const s of STICKERS) {
    const id = generateId('sh_sticker');
    await db.execute(sql`
      INSERT INTO stickers (id, name, emoji, category, is_premium)
      VALUES (${id}, ${s.name}, ${s.emoji}, ${s.category}, ${s.is_premium})
    `);
  }

  // Insert cosmetics
  for (const c of COSMETICS) {
    const id = generateId('sh_cosmetic');
    await db.execute(sql`
      INSERT INTO cosmetics (id, name, type, emoji_or_style, price)
      VALUES (${id}, ${c.name}, ${c.type}, ${c.emoji_or_style}, ${c.price})
    `);
  }

  return NextResponse.json({
    success: true,
    message: `Seeded ${STICKERS.length} stickers and ${COSMETICS.length} cosmetics`,
  });
}
