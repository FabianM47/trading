/**
 * Logto Sign-In Route
 * 
 * Initiiert den OIDC Login Flow.
 * GET /api/logto/sign-in
 */

import { logtoConfig } from '@/lib/auth/logto-config';
import { NextRequest, NextResponse } from 'next/server';
import LogtoClient from '@logto/next/server-actions';

export async function GET(request: NextRequest) {
  const client = new LogtoClient(logtoConfig);
  
  // handleSignIn gibt { url } zurück - wir müssen redirecten
  const { url } = await client.handleSignIn(request.nextUrl.origin + '/callback');
  
  return NextResponse.redirect(url);
}
