import { NextResponse } from 'next/server';
import { getSessionToken, deleteSession, clearSessionCookie } from '@/lib/user-auth';

export async function POST() {
  const token = getSessionToken();
  if (token) {
    await deleteSession(token);
  }
  clearSessionCookie();

  return NextResponse.json({ success: true });
}
