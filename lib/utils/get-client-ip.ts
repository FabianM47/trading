/**
 * IP Address Helper for Next.js API Routes
 * 
 * Extracts client IP address from Next.js requests, handling various
 * deployment scenarios (Vercel, proxies, direct connections).
 */

import { NextRequest } from 'next/server';

/**
 * Get client IP address from Next.js request
 * 
 * Checks multiple headers in order:
 * 1. X-Real-IP (Nginx proxy)
 * 2. X-Forwarded-For (most proxies/load balancers)
 * 3. CF-Connecting-IP (Cloudflare)
 * 4. True-Client-IP (Cloudflare Enterprise)
 * 5. Fallback to 'anonymous'
 * 
 * @param request - Next.js request object
 * @returns Client IP address or 'anonymous'
 */
export function getClientIp(request: NextRequest): string {
  // Try X-Real-IP (Nginx proxy)
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;

  // Try X-Forwarded-For (most common)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
    // Take the first one (original client)
    return forwardedFor.split(',')[0].trim();
  }

  // Try Cloudflare headers
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp;

  const trueClientIp = request.headers.get('true-client-ip');
  if (trueClientIp) return trueClientIp;

  // Fallback
  return 'anonymous';
}
