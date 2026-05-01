/**
 * Sliding-window in-memory rate limiter.
 * Usage in API routes:
 *   const { success, remaining } = rateLimit(req, { limit: 10, window: 60 });
 *   if (!success) return res.status(429).json({ error: 'Too many requests' });
 */

const store = new Map(); // key → [timestamps]

export function rateLimit(req, { limit = 60, window = 60 } = {}) {
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  const key   = `${ip}`;
  const now   = Date.now();
  const windowMs = window * 1000;

  const hits = (store.get(key) || []).filter(t => now - t < windowMs);
  hits.push(now);
  store.set(key, hits);

  // Cleanup old keys every ~5 min to prevent memory leak
  if (Math.random() < 0.01) {
    for (const [k, v] of store.entries()) {
      if (v.every(t => now - t >= windowMs)) store.delete(k);
    }
  }

  return { success: hits.length <= limit, remaining: Math.max(0, limit - hits.length) };
}

/** Strict limiter for auth endpoints: 10 attempts / 15 min */
export function authRateLimit(req) {
  return rateLimit(req, { limit: 10, window: 900 });
}
