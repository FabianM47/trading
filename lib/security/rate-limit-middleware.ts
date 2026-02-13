/**
 * Rate Limit Middleware for API Routes
 * 
 * Provides easy-to-use rate limiting middleware for Next.js API routes
 * with automatic header injection and error responses.
 * 
 * Usage:
 * ```typescript
 * // app/api/trades/route.ts
 * import { withRateLimit } from '@/lib/security/rate-limit-middleware';
 * 
 * export const POST = withRateLimit(
 *   async (request) => {
 *     // Your API logic here
 *     return NextResponse.json({ success: true });
 *   },
 *   { type: 'TRADE_CREATION' }
 * );
 * ```
 */

import { auth } from '@/auth';
import { getClientIp } from '@/lib/utils/get-client-ip';
import { NextRequest, NextResponse } from 'next/server';
import {
  getRateLimitHeaders,
  RATE_LIMITS,
  rateLimit,
  RateLimitConfig,
} from './rate-limit';

// ============================================================================
// Types
// ============================================================================

type RateLimitType = keyof typeof RATE_LIMITS;

interface RateLimitMiddlewareOptions {
  /**
   * Rate limit type (uses predefined limits from RATE_LIMITS)
   */
  type?: RateLimitType;

  /**
   * Custom rate limit configuration (overrides type)
   */
  custom?: Omit<RateLimitConfig, 'identifier'>;

  /**
   * Custom identifier function (default: IP for anonymous, user ID for authenticated)
   */
  getIdentifier?: (request: NextRequest) => Promise<string> | string;

  /**
   * Skip rate limiting for certain conditions
   */
  skip?: (request: NextRequest) => Promise<boolean> | boolean;

  /**
   * Custom error response
   */
  onRateLimitExceeded?: (request: NextRequest) => Response;
}

type RouteHandler = (
  request: NextRequest,
  context?: { params: Record<string, string> }
) => Promise<Response>;

// ============================================================================
// Rate Limit Middleware
// ============================================================================

/**
 * Wrap an API route handler with rate limiting
 * 
 * @param handler - The original route handler
 * @param options - Rate limiting options
 * @returns Wrapped handler with rate limiting
 * 
 * @example
 * ```typescript
 * // Simple usage with predefined limits
 * export const POST = withRateLimit(handler, { type: 'AUTHENTICATED' });
 * 
 * // Custom rate limit
 * export const POST = withRateLimit(handler, {
 *   custom: { limit: 5, window: 60 },
 * });
 * 
 * // With custom identifier
 * export const POST = withRateLimit(handler, {
 *   type: 'SEARCH',
 *   getIdentifier: async (req) => {
 *     const session = await auth();
 *     return session?.user?.id || req.ip || 'anonymous';
 *   },
 * });
 * ```
 */
export function withRateLimit(
  handler: RouteHandler,
  options: RateLimitMiddlewareOptions = {}
): RouteHandler {
  return async (request, context) => {
    // Check if rate limiting should be skipped
    if (options.skip && (await options.skip(request))) {
      return handler(request, context);
    }

    // Get rate limit configuration
    const config = options.custom || RATE_LIMITS[options.type || 'ANONYMOUS'];

    // Get identifier (IP or user ID)
    let identifier: string;
    if (options.getIdentifier) {
      identifier = await options.getIdentifier(request);
    } else {
      // Default: Use user ID if authenticated, otherwise IP
      const session = await auth();
      identifier = session?.user?.id || getClientIp(request);
    }

    // Apply rate limit
    const result = await rateLimit({
      identifier,
      ...config,
      prefix: options.type ? `rate_limit:${options.type.toLowerCase()}` : 'rate_limit',
    });

    // Get rate limit headers
    const rateLimitHeaders = getRateLimitHeaders(result);

    // If rate limit exceeded, return 429
    if (!result.success) {
      if (options.onRateLimitExceeded) {
        return options.onRateLimitExceeded(request);
      }

      return new NextResponse(
        JSON.stringify({
          error: 'Too Many Requests',
          message: 'You have exceeded the rate limit. Please try again later.',
          retryAfter: result.reset,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': (result.reset - Math.floor(Date.now() / 1000)).toString(),
            ...rateLimitHeaders,
          },
        }
      );
    }

    // Call original handler
    const response = await handler(request, context);

    // Add rate limit headers to response
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  };
}

// ============================================================================
// Convenience Wrappers
// ============================================================================

/**
 * Rate limit for authentication endpoints (strict)
 */
export function withAuthRateLimit(handler: RouteHandler): RouteHandler {
  return withRateLimit(handler, {
    type: 'AUTH',
    getIdentifier: (req) => getClientIp(req),
  });
}

/**
 * Rate limit for authenticated users (generous)
 */
export function withAuthenticatedRateLimit(handler: RouteHandler): RouteHandler {
  return withRateLimit(handler, {
    type: 'AUTHENTICATED',
    getIdentifier: async (req) => {
      const session = await auth();
      if (!session?.user?.id) {
        throw new Error('Unauthorized');
      }
      return session.user.id;
    },
  });
}

/**
 * Rate limit for anonymous users (strict)
 */
export function withAnonymousRateLimit(handler: RouteHandler): RouteHandler {
  return withRateLimit(handler, {
    type: 'ANONYMOUS',
    getIdentifier: (req) => getClientIp(req),
  });
}

/**
 * Rate limit for trade creation (prevents duplicates)
 */
export function withTradeRateLimit(handler: RouteHandler): RouteHandler {
  return withRateLimit(handler, {
    type: 'TRADE_CREATION',
    getIdentifier: async (req) => {
      const session = await auth();
      return session?.user?.id || getClientIp(req);
    },
  });
}

/**
 * Rate limit for search endpoints (prevents expensive queries)
 */
export function withSearchRateLimit(handler: RouteHandler): RouteHandler {
  return withRateLimit(handler, {
    type: 'SEARCH',
    getIdentifier: async (req) => {
      const session = await auth();
      return session?.user?.id || getClientIp(req);
    },
  });
}
