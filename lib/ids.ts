import { nanoid } from 'nanoid';

export function generateId(prefix: string): string {
  return `${prefix}_${nanoid(16)}`;
}

export function generateApiKey(): string {
  return `shellmates_${nanoid(32)}`;
}

export function generateVerificationCode(): string {
  return nanoid(8);
}
