/**
 * User Info API Route
 * 
 * Gibt die aktuellen User Claims (ID Token) zurück.
 * GET /api/logto/user
 * 
 * Response: { claims: {...}, isAuthenticated: boolean }
 */

import LogtoClient from '@logto/next/server-actions';
import { NextResponse } from 'next/server';
import { logtoConfig } from '@/lib/auth/logto-config';
import { logError } from '@/lib/logger';

export async function GET() {
  try {
    const client = new LogtoClient(logtoConfig);
    const context = await client.getLogtoContext();
    
    // Guard: Nicht authentifiziert
    if (!context.isAuthenticated) {
      return NextResponse.json(
        { isAuthenticated: false, claims: null },
        { status: 401 }
      );
    }

    // Return user claims
    return NextResponse.json({
      isAuthenticated: true,
      claims: context.claims,
    });
  } catch (error) {
    logError('❌ User info error', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch user info' },
      { status: 500 }
    );
  }
}
