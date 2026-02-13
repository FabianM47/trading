-- ============================================================================
-- Auth.js / NextAuth Database Schema for PostgreSQL
-- ============================================================================
-- This schema is compatible with @auth/drizzle-adapter
-- Run this after creating your database
-- ============================================================================

-- Drop existing tables if they exist (be careful in production!)
-- DROP TABLE IF EXISTS verification_tokens CASCADE;
-- DROP TABLE IF EXISTS sessions CASCADE;
-- DROP TABLE IF EXISTS accounts CASCADE;
-- DROP TABLE IF EXISTS authenticators CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

-- ============================================================================
-- USERS Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  email VARCHAR(255) NOT NULL UNIQUE,
  "emailVerified" TIMESTAMP,
  image TEXT,
  
  -- Trading App specific fields
  default_currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  totp_secret VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================================
-- ACCOUNTS Table (OAuth Providers)
-- ============================================================================

CREATE TABLE IF NOT EXISTS accounts (
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  "providerAccountId" VARCHAR(255) NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type VARCHAR(255),
  scope VARCHAR(255),
  id_token TEXT,
  session_state VARCHAR(255),
  
  PRIMARY KEY (provider, "providerAccountId")
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts("userId");

-- ============================================================================
-- SESSIONS Table (Database Sessions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sessions (
  "sessionToken" VARCHAR(255) PRIMARY KEY,
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMP NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions("userId");

-- ============================================================================
-- VERIFICATION TOKENS Table (Email Magic Links)
-- ============================================================================

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires TIMESTAMP NOT NULL,
  
  PRIMARY KEY (identifier, token)
);

-- ============================================================================
-- AUTHENTICATORS Table (WebAuthn - Future)
-- ============================================================================

CREATE TABLE IF NOT EXISTS authenticators (
  "credentialID" VARCHAR(255) NOT NULL UNIQUE,
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "providerAccountId" VARCHAR(255) NOT NULL,
  "credentialPublicKey" TEXT NOT NULL,
  counter INTEGER NOT NULL,
  "credentialDeviceType" VARCHAR(255) NOT NULL,
  "credentialBackedUp" BOOLEAN NOT NULL,
  transports VARCHAR(255),
  
  PRIMARY KEY ("userId", "credentialID")
);

-- ============================================================================
-- TRIGGERS (Auto-update updated_at)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'User accounts (Auth.js + Trading App fields)';
COMMENT ON TABLE accounts IS 'OAuth provider accounts linked to users';
COMMENT ON TABLE sessions IS 'Active user sessions (database strategy)';
COMMENT ON TABLE verification_tokens IS 'Email magic link verification tokens';
COMMENT ON TABLE authenticators IS 'WebAuthn authenticators for passwordless login';

COMMENT ON COLUMN users.email IS 'Unique email address for authentication';
COMMENT ON COLUMN users."emailVerified" IS 'Timestamp when email was verified';
COMMENT ON COLUMN users.default_currency IS 'Default currency for trading (ISO 4217)';
COMMENT ON COLUMN users.totp_enabled IS 'Whether 2FA TOTP is enabled';
COMMENT ON COLUMN users.totp_secret IS 'TOTP secret for 2FA (encrypted)';
COMMENT ON COLUMN users.last_login_at IS 'Timestamp of last login';

COMMENT ON COLUMN accounts.type IS 'Account type: email | oauth | oidc | webauthn';
COMMENT ON COLUMN accounts.provider IS 'Provider ID: google | github | etc.';
COMMENT ON COLUMN accounts."providerAccountId" IS 'Unique ID from OAuth provider';
COMMENT ON COLUMN accounts.refresh_token IS 'OAuth refresh token (encrypted)';
COMMENT ON COLUMN accounts.access_token IS 'OAuth access token (encrypted)';

COMMENT ON COLUMN sessions."sessionToken" IS 'Unique session token (UUID)';
COMMENT ON COLUMN sessions.expires IS 'Session expiry timestamp';

COMMENT ON COLUMN verification_tokens.identifier IS 'Email address or user ID';
COMMENT ON COLUMN verification_tokens.token IS 'Verification token (hashed)';
COMMENT ON COLUMN verification_tokens.expires IS 'Token expiry timestamp (usually 10 min)';

-- ============================================================================
-- SAMPLE QUERIES (for testing)
-- ============================================================================

-- Get all users with their accounts
-- SELECT u.*, a.provider, a.type 
-- FROM users u 
-- LEFT JOIN accounts a ON u.id = a."userId";

-- Get all active sessions
-- SELECT s.*, u.email 
-- FROM sessions s 
-- JOIN users u ON s."userId" = u.id 
-- WHERE s.expires > NOW();

-- Clean up expired sessions
-- DELETE FROM sessions WHERE expires < NOW();

-- Clean up expired verification tokens
-- DELETE FROM verification_tokens WHERE expires < NOW();

-- ============================================================================
-- SECURITY RECOMMENDATIONS
-- ============================================================================

-- 1. Enable Row Level Security (RLS)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- 2. Create RLS Policies (example for users)
-- CREATE POLICY users_select_own ON users 
--   FOR SELECT USING (auth.uid() = id);

-- 3. Regular cleanup of expired data (cron job)
-- Create a cron job to run: DELETE FROM sessions WHERE expires < NOW();

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
