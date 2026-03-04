/**
 * Simple In-Memory Rate Limiter
 * 
 * ⚠️ SICHERHEITSHINWEIS:
 * Auf Vercel Serverless wird der Speicher pro Cold Start gelöscht.
 * Das bedeutet, dass dieser Rate-Limiter nur innerhalb einer
 * Warm-Instance wirkt (typisch ~5-15 Min bei Traffic).
 * 
 * Für zuverlässiges Rate-Limiting in Production:
 * - Vercel WAF (Pro Plan) – empfohlen
 * - Upstash Redis (@upstash/ratelimit)
 * - Cloudflare Rate Limiting (als Reverse Proxy)
 * 
 * Der In-Memory Limiter bietet trotzdem einen Basis-Schutz gegen:
 * - Burst-Requests innerhalb einer Warm-Instance
 * - Lokale Entwicklung
 * - Bot-Scraping (bei warmem Server)
 */

const rateLimit = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  interval: number; // ms
  maxRequests: number;
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { interval: 60000, maxRequests: 10 }
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const key = identifier;
  const limit = rateLimit.get(key);

  // Cleanup expired entries
  if (limit && now > limit.resetTime) {
    rateLimit.delete(key);
  }

  const current = rateLimit.get(key);

  if (!current) {
    // First request
    rateLimit.set(key, {
      count: 1,
      resetTime: now + config.interval,
    });
    return { allowed: true, remaining: config.maxRequests - 1 };
  }

  // Check limit
  if (current.count >= config.maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  // Increment
  current.count++;
  return { allowed: true, remaining: config.maxRequests - current.count };
}

/**
 * Get client identifier (IP or Session)
 */
export function getClientIdentifier(request: Request): string {
  // Vercel/Production: Use X-Forwarded-For
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  // Fallback: Random identifier (Dev)
  return 'local-dev';
}
