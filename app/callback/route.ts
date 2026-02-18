/**
 * Logto Callback Route
 * 
 * Behandelt den OIDC Callback nach erfolgreicher Authentifizierung.
 * GET /callback?code=...&state=...
 * 
 * WICHTIG: Diese Route MUSS öffentlich zugänglich sein (kein Auth Guard).
 * 
 * Diese Route ist bei /callback statt /api/logto/callback, weil das Logto SDK
 * standardmäßig ${baseUrl}/callback als Redirect URI verwendet.
 */

import LogtoClient from '@logto/next/server-actions';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';
import { logtoConfig } from '@/lib/auth/logto-config';

export async function GET(request: NextRequest) {
  const client = new LogtoClient(logtoConfig);
  
  try {
    // handleSignInCallback verarbeitet code+state und speichert Session in Cookies
    await client.handleSignInCallback(request.url);
  } catch (error) {
    console.error('❌ Callback Error:', error);
    // Bei Fehler zum Login zurück
    redirect('/api/logto/sign-in');
  }
  
  // Nach erfolgreichem Login redirecten
  // (außerhalb try-catch, da redirect() einen NEXT_REDIRECT Error wirft)
  redirect('/');
}
