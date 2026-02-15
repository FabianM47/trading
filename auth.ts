/**
 * Auth.js (NextAuth v5) Configuration
 * 
 * Supports:
 * - Google OAuth only
 * - Database Sessions (Vercel Postgres via Drizzle)
 * 
 * Environment Variables Required:
 * - AUTH_SECRET (generate with: openssl rand -base64 32)
 * - AUTH_URL (production URL, e.g., https://trading.vercel.app)
 * - POSTGRES_URL (Vercel Postgres connection string)
 * - AUTH_GOOGLE_ID (Google Client ID)
 * - AUTH_GOOGLE_SECRET (Google Client Secret)
 */

import { db } from '@/db';
import {
  authAccounts,
  authAuthenticators,
  authSessions,
  authUsers,
  authVerificationTokens,
} from '@/db/auth-schema';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

// ============================================================================
// Auth.js Configuration
// ============================================================================

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Required for Vercel deployment
  trustHost: true,

  adapter: DrizzleAdapter(db, {
    usersTable: authUsers,
    accountsTable: authAccounts,
    sessionsTable: authSessions,
    verificationTokensTable: authVerificationTokens,
    authenticatorsTable: authAuthenticators,
  }),

  // Session Strategy: Database Sessions (secure, revocable)
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },

  // Custom Pages
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },

  // Providers: Google OAuth only
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      allowDangerousEmailAccountLinking: true, // Auto-link if email matches
    }),
  ],

  // Callbacks
  callbacks: {
    // JWT Callback (not used with database sessions, but keep for compatibility)
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    // Session Callback: Add user ID and email to session
    async session({ session, user }) {
      if (session?.user && user) {
        session.user.id = user.id;
        session.user.email = user.email ?? null;
      }
      return session;
    },

    // SignIn Callback: Control who can sign in
    async signIn({ user, account, profile, email, credentials }) {
      // Allow all sign-ins by default
      // Add custom logic here if needed (e.g., email domain whitelist)
      return true;
    },

    // Redirect Callback: Control where users are redirected after sign in/out
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },

  // Events
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log(`User signed in: ${user.email}`, { isNewUser });

      // Update lastLoginAt
      // await db.update(authUsers).set({ lastLoginAt: new Date() }).where(eq(authUsers.id, user.id));
    },
    async signOut(message) {
      console.log('User signed out', message);
    },
    async createUser({ user }) {
      console.log(`New user created: ${user.email}`);
    },
  },

  // Debug mode (disable in production)
  debug: process.env.NODE_ENV === 'development',
});

// ============================================================================
// Email Templates
// ============================================================================

/**
 * Plain text email template
 */
function text({ url, host }: { url: string; host: string }) {
  return `Sign in to ${host}\n\nClick the link below to sign in:\n${url}\n\nThis link expires in 10 minutes.\n`;
}

/**
 * HTML email template (Trade Republic inspired)
 */
function html({ url, host }: { url: string; host: string }) {
  const escapedHost = host.replace(/\./g, '&#8203;.');

  // Trade Republic color scheme
  const brandColor = '#00D395'; // Mint green
  const backgroundColor = '#f4f4f4';
  const textColor = '#333333';

  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to ${escapedHost}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${backgroundColor};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${backgroundColor}; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: ${textColor};">
                Sign in to ${escapedHost}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 0 40px 30px; color: ${textColor}; font-size: 16px; line-height: 1.6;">
              <p style="margin: 0 0 20px;">Click the button below to sign in to your account:</p>
            </td>
          </tr>

          <!-- Button -->
          <tr>
            <td style="padding: 0 40px 30px;" align="center">
              <a href="${url}" 
                 target="_blank" 
                 style="display: inline-block; padding: 16px 32px; background-color: ${brandColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Sign in
              </a>
            </td>
          </tr>

          <!-- Alternative Link -->
          <tr>
            <td style="padding: 0 40px 30px; color: #666666; font-size: 14px; line-height: 1.6;">
              <p style="margin: 0;">Or copy and paste this URL into your browser:</p>
              <p style="margin: 10px 0 0; word-break: break-all; color: ${brandColor};">
                <a href="${url}" target="_blank" style="color: ${brandColor};">${url}</a>
              </p>
            </td>
          </tr>

          <!-- Security Note -->
          <tr>
            <td style="padding: 0 40px 40px; color: #666666; font-size: 14px; line-height: 1.6; border-top: 1px solid #eeeeee;">
              <p style="margin: 20px 0 0;">
                <strong>Security note:</strong> This link expires in 10 minutes and can only be used once.
                If you didn't request this email, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table width="600" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
          <tr>
            <td style="padding: 20px; text-align: center; color: #999999; font-size: 12px;">
              <p style="margin: 0;">
                © ${new Date().getFullYear()} ${escapedHost}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
