/**
 * Logto Configuration
 * 
 * Zentrale Konfiguration für Logto OIDC Integration.
 * Validiert Environment Variables und stellt sichere Defaults bereit.
 * 
 * SECURITY: Keine Secrets werden exportiert, nur public configuration.
 */

// Logto v4 Config-Interface (kompatibel mit LogtoNextConfig)
export interface LogtoConfig {
  endpoint: string;
  appId: string;
  appSecret: string;
  baseUrl: string;
  cookieSecret: string;
  cookieSecure: boolean;
  resources?: string[];
}

/**
 * Liest und validiert Environment Variables
 * Fail-fast Pattern: Wirft Fehler bei fehlenden Required Vars
 */
function readEnv() {
  const endpoint = process.env.LOGTO_ENDPOINT;
  const appId = process.env.LOGTO_APP_ID;
  const appSecret = process.env.LOGTO_APP_SECRET;
  const cookieSecret = process.env.LOGTO_COOKIE_SECRET;
  const baseUrl = process.env.APP_BASE_URL;

  // Guard: Required ENV vars müssen gesetzt sein
  if (!endpoint) {
    throw new Error('❌ LOGTO_ENDPOINT is not defined in environment variables');
  }

  if (!appId) {
    throw new Error('❌ LOGTO_APP_ID is not defined in environment variables');
  }

  if (!appSecret) {
    throw new Error('❌ LOGTO_APP_SECRET is not defined in environment variables');
  }

  if (!cookieSecret) {
    throw new Error('❌ LOGTO_COOKIE_SECRET is not defined in environment variables');
  }

  // Logto Cookie Keys sind ca. 20-25 Zeichen lang (z.B. ov613c3o4fpcwvn5j4vi2)
  // Keine strikte Längen-Validierung nötig, Logto managed das selbst

  // BaseURL mit Fallback (dev only)
  const resolvedBaseUrl = baseUrl || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('❌ APP_BASE_URL is required in production');
    }
    console.warn('⚠️ APP_BASE_URL not set, using localhost:3000 (dev only)');
    return 'http://localhost:3000';
  })();

  return {
    endpoint,
    appId,
    appSecret,
    cookieSecret,
    baseUrl: resolvedBaseUrl,
  };
}

// Read and validate environment
const env = readEnv();

/**
 * App Base URL (varies by environment)
 */
export const appBaseUrl = env.baseUrl;

/**
 * Logto Redirect URIs
 * WICHTIG: /callback (NICHT /api/logto/callback) - Logto SDK Default
 */
export const callbackUrl = `${appBaseUrl}/callback`;
export const signInRedirectUrl = `${appBaseUrl}/api/logto/sign-in`;
export const signOutRedirectUrl = `${appBaseUrl}/`;

/**
 * Type-safe environment info
 */
export const isProduction = process.env.NODE_ENV === 'production';
export const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Logto Configuration for Next.js SDK
 */
export const logtoConfig: LogtoConfig = {
  endpoint: env.endpoint,
  appId: env.appId,
  appSecret: env.appSecret,
  cookieSecret: env.cookieSecret,
  baseUrl: appBaseUrl,
  cookieSecure: isProduction, // HTTPS nur in Production
  resources: [], // Add API resources if needed
};

/**
 * Public configuration (safe to use in client components)
 */
export const publicConfig = {
  appBaseUrl,
  callbackUrl,
  signInUrl: '/api/logto/sign-in',
  signOutUrl: '/api/logto/sign-out',
  userInfoUrl: '/api/logto/user',
} as const;

// Log configuration in development
if (isDevelopment) {
  console.log('🔐 Logto Config Loaded:', {
    endpoint: env.endpoint,
    appId: env.appId,
    baseUrl: appBaseUrl,
    callbackUrl,
  });
}
