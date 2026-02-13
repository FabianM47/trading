/**
 * CSRF Protection for API Routes
 * 
 * Implements Origin verification to prevent Cross-Site Request Forgery attacks.
 * Next.js Server Actions have built-in CSRF protection, but API routes need manual checks.
 * 
 * Features:
 * - Origin header verification
 * - Referer header verification (fallback)
 * - Whitelist of allowed origins
 * - Development mode bypass
 * 
 * Usage:
 * ```typescript
 * import { verifyCsrf } from '@/lib/security/csrf';
 * 
 * export async function POST(request: NextRequest) {
 *   // Verify CSRF token/origin
 *   const csrfCheck = verifyCsrf(request);
 *   if (!csrfCheck.valid) {
 *     return NextResponse.json(
 *       { error: csrfCheck.reason },
 *       { status: 403 }
 *     );
 *   }
 * 
 *   // Your API logic here
 * }
 * ```
 */

import { NextRequest } from 'next/server';

// ============================================================================
// Types
// ============================================================================

export interface CsrfCheckResult {
  /**
   * Whether the CSRF check passed
   */
  valid: boolean;

  /**
   * Reason for failure (if valid === false)
   */
  reason?: string;

  /**
   * Origin that was checked
   */
  origin?: string;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Allowed origins for CSRF protection
 * In production, this should be your actual domain(s)
 */
function getAllowedOrigins(): string[] {
  const origins: string[] = [];

  // Production URL
  if (process.env.AUTH_URL) {
    origins.push(process.env.AUTH_URL);
  }

  // Vercel deployment URLs
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`);
  }

  // Development
  if (process.env.NODE_ENV === 'development') {
    origins.push('http://localhost:3000');
    origins.push('http://127.0.0.1:3000');
  }

  return origins;
}

/**
 * Safe HTTP methods that don't need CSRF protection
 */
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

// ============================================================================
// CSRF Verification
// ============================================================================

/**
 * Verify CSRF protection by checking Origin/Referer headers
 * 
 * @param request - Next.js request object
 * @returns CSRF check result
 * 
 * @example
 * ```typescript
 * // In API route
 * const csrfCheck = verifyCsrf(request);
 * if (!csrfCheck.valid) {
 *   return NextResponse.json(
 *     { error: 'CSRF check failed', reason: csrfCheck.reason },
 *     { status: 403 }
 *   );
 * }
 * ```
 */
export function verifyCsrf(request: NextRequest): CsrfCheckResult {
  const method = request.method;

  // Skip CSRF check for safe methods (GET, HEAD, OPTIONS)
  if (SAFE_METHODS.includes(method)) {
    return { valid: true };
  }

  // Get origin from headers
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // Get allowed origins
  const allowedOrigins = getAllowedOrigins();

  // Check Origin header (preferred)
  if (origin) {
    const isAllowed = allowedOrigins.some((allowed) => origin === allowed);

    if (isAllowed) {
      return { valid: true, origin };
    }

    return {
      valid: false,
      reason: 'Origin not allowed',
      origin,
    };
  }

  // Fallback to Referer header
  if (referer) {
    const refererOrigin = new URL(referer).origin;
    const isAllowed = allowedOrigins.some((allowed) => refererOrigin === allowed);

    if (isAllowed) {
      return { valid: true, origin: refererOrigin };
    }

    return {
      valid: false,
      reason: 'Referer not allowed',
      origin: refererOrigin,
    };
  }

  // No Origin or Referer header (suspicious)
  return {
    valid: false,
    reason: 'Missing Origin and Referer headers',
  };
}

/**
 * CSRF middleware for API routes
 * 
 * @param handler - The original route handler
 * @returns Wrapped handler with CSRF protection
 * 
 * @example
 * ```typescript
 * import { withCsrf } from '@/lib/security/csrf';
 * 
 * export const POST = withCsrf(async (request) => {
 *   // Your API logic here
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withCsrf<T extends (...args: any[]) => Promise<Response>>(
  handler: T
): T {
  return (async (...args: any[]) => {
    const request = args[0] as NextRequest;

    // Verify CSRF
    const csrfCheck = verifyCsrf(request);

    if (!csrfCheck.valid) {
      return new Response(
        JSON.stringify({
          error: 'CSRF Verification Failed',
          reason: csrfCheck.reason,
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Call original handler
    return handler(...args);
  }) as T;
}

/**
 * Check if request is from same origin (simple check)
 * 
 * @param request - Next.js request object
 * @returns True if same origin
 */
export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');

  if (origin) {
    return origin === `https://${host}` || origin === `http://${host}`;
  }

  if (referer) {
    const refererOrigin = new URL(referer).origin;
    return refererOrigin === `https://${host}` || refererOrigin === `http://${host}`;
  }

  return false;
}
