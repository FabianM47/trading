/**
 * Rate Limiting Implementation with Vercel KV (Redis)
 * 
 * Implements sliding window rate limiting with Redis for distributed rate limiting
 * across multiple Vercel edge functions.
 * 
 * Features:
 * - Per-IP rate limiting (unauthenticated requests)
 * - Per-User rate limiting (authenticated requests)
 * - Sliding window algorithm (more accurate than fixed window)
 * - Automatic cleanup of old entries
 * - Rate limit headers in responses
 * 
 * Usage:
 * ```typescript
 * import { rateLimit } from '@/lib/security/rate-limit';
 * 
 * const { success, limit, remaining, reset } = await rateLimit({
 *   identifier: req.ip || 'anonymous',
 *   limit: 10,
 *   window: 60, // 60 seconds
 * });
 * 
 * if (!success) {
 *   return new Response('Too many requests', { status: 429 });
 * }
 * ```
 */

import { kv } from '@vercel/kv';

// ============================================================================
// Types
// ============================================================================

export interface RateLimitConfig {
  /**
   * Unique identifier for rate limiting (e.g., IP address, user ID)
   */
  identifier: string;

  /**
   * Maximum number of requests allowed in the time window
   */
  limit: number;

  /**
   * Time window in seconds
   */
  window: number;

  /**
   * Optional prefix for the Redis key (useful for different rate limit types)
   * @default 'rate_limit'
   */
  prefix?: string;
}

export interface RateLimitResult {
  /**
   * Whether the request is allowed (under the rate limit)
   */
  success: boolean;

  /**
   * Maximum number of requests allowed
   */
  limit: number;

  /**
   * Number of requests remaining in the current window
   */
  remaining: number;

  /**
   * Timestamp (in seconds) when the rate limit resets
   */
  reset: number;

  /**
   * Total number of requests made in the current window
   */
  current: number;
}

// ============================================================================
// Rate Limiting Presets
// ============================================================================

export const RATE_LIMITS = {
  /**
   * Strict rate limit for authentication endpoints (login, signup, password reset)
   * Prevents brute force attacks
   */
  AUTH: {
    limit: 5,
    window: 15 * 60, // 15 minutes
  },

  /**
   * Rate limit for unauthenticated API requests
   * Protects against DoS attacks
   */
  ANONYMOUS: {
    limit: 10,
    window: 60, // 1 minute
  },

  /**
   * Rate limit for authenticated API requests
   * More generous for logged-in users
   */
  AUTHENTICATED: {
    limit: 100,
    window: 60, // 1 minute
  },

  /**
   * Rate limit for external API calls (stock prices, etc.)
   * Respects third-party API limits
   */
  EXTERNAL_API: {
    limit: 60,
    window: 60, // 1 minute
  },

  /**
   * Rate limit for trade creation
   * Prevents accidental duplicate trades
   */
  TRADE_CREATION: {
    limit: 20,
    window: 60, // 1 minute
  },

  /**
   * Rate limit for search endpoints
   * Prevents expensive database queries
   */
  SEARCH: {
    limit: 30,
    window: 60, // 1 minute
  },
} as const;

// ============================================================================
// Core Rate Limiting Function
// ============================================================================

/**
 * Rate limit a request using Redis sliding window algorithm
 * 
 * @param config - Rate limit configuration
 * @returns Rate limit result with success status and metadata
 * 
 * @example
 * ```typescript
 * // Rate limit by IP
 * const result = await rateLimit({
 *   identifier: req.ip,
 *   limit: 10,
 *   window: 60,
 * });
 * 
 * // Rate limit by user ID
 * const result = await rateLimit({
 *   identifier: userId,
 *   ...RATE_LIMITS.AUTHENTICATED,
 * });
 * ```
 */
export async function rateLimit(
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { identifier, limit, window, prefix = 'rate_limit' } = config;

  // Generate Redis key
  const key = `${prefix}:${identifier}`;

  // Current timestamp in milliseconds
  const now = Date.now();

  // Window start time (milliseconds)
  const windowStart = now - window * 1000;

  try {
    // Use Redis pipeline for atomic operations
    const pipeline = kv.pipeline();

    // 1. Remove old entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart);

    // 2. Count requests in current window
    pipeline.zcard(key);

    // 3. Add current request
    pipeline.zadd(key, { score: now, member: `${now}:${Math.random()}` });

    // 4. Set expiry on the key (cleanup)
    pipeline.expire(key, window);

    // Execute pipeline
    const results = await pipeline.exec();

    // Extract count (second operation result)
    const count = (results[1] as number) || 0;

    // Calculate remaining requests
    const remaining = Math.max(0, limit - count - 1);

    // Calculate reset time (end of current window)
    const reset = Math.ceil((now + window * 1000) / 1000);

    // Check if rate limit exceeded
    const success = count < limit;

    return {
      success,
      limit,
      remaining,
      reset,
      current: count + 1,
    };
  } catch (error) {
    console.error('Rate limit error:', error);

    // Fail open: Allow request if Redis is unavailable
    // In production, you might want to fail closed (return false)
    return {
      success: true,
      limit,
      remaining: limit,
      reset: Math.ceil((now + window * 1000) / 1000),
      current: 0,
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get rate limit headers for HTTP response
 * 
 * @param result - Rate limit result
 * @returns Headers object
 * 
 * @example
 * ```typescript
 * const result = await rateLimit({ ... });
 * const headers = getRateLimitHeaders(result);
 * 
 * return new Response(body, {
 *   status: result.success ? 200 : 429,
 *   headers,
 * });
 * ```
 */
export function getRateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  };
}

/**
 * Reset rate limit for a specific identifier (e.g., after successful login)
 * 
 * @param identifier - Unique identifier
 * @param prefix - Optional prefix for Redis key
 * 
 * @example
 * ```typescript
 * // Reset rate limit after successful login
 * await resetRateLimit(req.ip, 'auth');
 * ```
 */
export async function resetRateLimit(
  identifier: string,
  prefix = 'rate_limit'
): Promise<void> {
  const key = `${prefix}:${identifier}`;

  try {
    await kv.del(key);
  } catch (error) {
    console.error('Failed to reset rate limit:', error);
  }
}

/**
 * Get current rate limit status without incrementing counter
 * 
 * @param config - Rate limit configuration
 * @returns Current rate limit status
 * 
 * @example
 * ```typescript
 * const status = await getRateLimitStatus({
 *   identifier: userId,
 *   ...RATE_LIMITS.AUTHENTICATED,
 * });
 * 
 * console.log(`${status.remaining}/${status.limit} requests remaining`);
 * ```
 */
export async function getRateLimitStatus(
  config: RateLimitConfig
): Promise<Omit<RateLimitResult, 'success'>> {
  const { identifier, limit, window, prefix = 'rate_limit' } = config;

  const key = `${prefix}:${identifier}`;
  const now = Date.now();
  const windowStart = now - window * 1000;

  try {
    // Remove old entries and count
    await kv.zremrangebyscore(key, 0, windowStart);
    const count = await kv.zcard(key);

    const remaining = Math.max(0, limit - count);
    const reset = Math.ceil((now + window * 1000) / 1000);

    return {
      limit,
      remaining,
      reset,
      current: count,
    };
  } catch (error) {
    console.error('Failed to get rate limit status:', error);

    return {
      limit,
      remaining: limit,
      reset: Math.ceil((now + window * 1000) / 1000),
      current: 0,
    };
  }
}
