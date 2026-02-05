import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { db } from './db';
import { sql } from 'drizzle-orm';
import { generateId } from './ids';
import { nanoid } from 'nanoid';

const BCRYPT_COST = 10;
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const COOKIE_NAME = 'sh_session';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<string> {
  const id = generateId('sess');
  const token = nanoid(48);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.execute(sql`
    INSERT INTO user_sessions (id, user_id, token, expires_at)
    VALUES (${id}, ${userId}, ${token}, ${expiresAt})
  `);

  return token;
}

export async function validateSession(token: string) {
  const result = await db.execute(sql`
    SELECT us.id, us.user_id, us.expires_at,
           u.id as uid, u.email, u.username, u.display_name, u.bio,
           u.avatar_emoji, u.avatar_color, u.is_verified, u.coins, u.equipped_badge, u.created_at, u.last_login
    FROM user_sessions us
    JOIN users u ON u.id = us.user_id
    WHERE us.token = ${token}
  `);

  if (result.rows.length === 0) return null;

  const row = result.rows[0] as any;
  if (new Date(row.expires_at) < new Date()) {
    await db.execute(sql`DELETE FROM user_sessions WHERE token = ${token}`);
    return null;
  }

  return sanitizeUser(row);
}

export async function deleteSession(token: string) {
  await db.execute(sql`DELETE FROM user_sessions WHERE token = ${token}`);
}

export function setSessionCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_MS / 1000,
  });
}

export function clearSessionCookie() {
  cookies().set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export function getSessionToken(): string | undefined {
  return cookies().get(COOKIE_NAME)?.value;
}

export async function getSessionUser() {
  const token = getSessionToken();
  if (!token) return null;
  return validateSession(token);
}

export function sanitizeUser(row: any) {
  return {
    id: row.uid ?? row.id,
    email: row.email,
    username: row.username,
    display_name: row.display_name,
    bio: row.bio,
    avatar_emoji: row.avatar_emoji,
    avatar_color: row.avatar_color,
    is_verified: row.is_verified,
    coins: row.coins ?? 100,
    equipped_badge: row.equipped_badge ?? null,
    created_at: row.created_at,
    last_login: row.last_login,
  };
}
