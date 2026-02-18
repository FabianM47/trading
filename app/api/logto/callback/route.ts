/**
 * Logto Callback Route
 * 
 * Behandelt den OIDC Callback nach erfolgreicher Authentifizierung.
 * GET /api/logto/callback?code=...&state=...
 * 
 * WICHTIG: Diese Route MUSS öffentlich zugänglich sein (kein Auth Guard).
 */

import { handleSignIn } from '@logto/next/server-actions';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';
import { logtoConfig } from '@/lib/auth/logto-config';

export async function GET(request: NextRequest) {
  // Übergebe die komplette URL (nicht nur searchParams) für Logto v4
  const callbackUrl = request.nextUrl;
  
  // handleSignIn verarbeitet den Callback und speichert die Session
  await handleSignIn(logtoConfig, callbackUrl);
  
  // Expliziter redirect nach erfolgreichem Login
  redirect('/');
}
