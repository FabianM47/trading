/**
 * Logto Sign-In Route
 * 
 * Initiiert den OIDC Login Flow.
 * GET /api/logto/sign-in
 */

import { logtoConfig } from '@/lib/auth/logto-config';
import { NextRequest, NextResponse } from 'next/server';
import LogtoClient from '@logto/next/server-actions';
import { checkRateLimit, getClientIdentifier } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  // Rate Limit: 10 Requests/Minute pro IP
  const clientId = getClientIdentifier(request);
  const { allowed } = checkRateLimit(clientId, { interval: 60000, maxRequests: 10 });

  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  const client = new LogtoClient(logtoConfig);
  
  // handleSignIn gibt { url } zurück - wir müssen redirecten
  const { url } = await client.handleSignIn(request.nextUrl.origin + '/callback');
  
  return NextResponse.redirect(url);
}
