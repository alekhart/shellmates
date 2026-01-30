const windows = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  let timestamps = windows.get(key) ?? [];
  timestamps = timestamps.filter((t) => t > windowStart);

  if (timestamps.length >= maxRequests) {
    const resetAt = timestamps[0] + windowMs;
    return { allowed: false, remaining: 0, resetAt };
  }

  timestamps.push(now);
  windows.set(key, timestamps);

  return {
    allowed: true,
    remaining: maxRequests - timestamps.length,
    resetAt: windowStart + windowMs,
  };
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  const oneHourAgo = now - 3600000;
  windows.forEach((timestamps, key) => {
    const filtered = timestamps.filter((t) => t > oneHourAgo);
    if (filtered.length === 0) {
      windows.delete(key);
    } else {
      windows.set(key, filtered);
    }
  });
}, 60000);
