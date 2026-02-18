/**
 * Logto Sign-Out Route
 * 
 * Initiiert den OIDC Logout Flow.
 * GET /api/logto/sign-out
 */

import LogtoClient from '@logto/next/server-actions';
import { NextRequest, NextResponse } from 'next/server';
import { logtoConfig } from '@/lib/auth/logto-config';

export async function GET(request: NextRequest) {
  const client = new LogtoClient(logtoConfig);
  
  // handleSignOut gibt die Logto Sign-Out URL zurück
  const signOutUrl = await client.handleSignOut(request.nextUrl.origin);
  
  return NextResponse.redirect(signOutUrl);
}
