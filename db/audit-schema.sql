-- ============================================================================
-- Audit Logging Schema for PostgreSQL
-- ============================================================================
-- Tracks security events and user actions for compliance and debugging
-- Run this after the auth schema
-- ============================================================================

-- Drop existing table if it exists (be careful in production!)
-- DROP TABLE IF EXISTS audit_logs CASCADE;

-- ============================================================================
-- AUDIT_LOGS Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event information
  event VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  
  -- User information
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  
  -- Request information
  ip_address VARCHAR(45), -- IPv6 max length
  user_agent TEXT,
  request_path TEXT,
  request_method VARCHAR(10),
  
  -- Event details
  metadata JSONB,
  
  -- Status
  success VARCHAR(5) NOT NULL DEFAULT 'true',
  error_message TEXT,
  
  -- Timestamp
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Primary lookups
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON audit_logs(event);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON audit_logs(success);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_event ON audit_logs(user_id, event);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category_action ON audit_logs(category, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_timestamp ON audit_logs(ip_address, timestamp DESC);

-- JSONB index for metadata queries (optional)
CREATE INDEX IF NOT EXISTS idx_audit_logs_metadata ON audit_logs USING gin(metadata);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE audit_logs IS 'Audit trail for security events and user actions';
COMMENT ON COLUMN audit_logs.event IS 'Full event name (e.g., user.login, trade.created)';
COMMENT ON COLUMN audit_logs.category IS 'Event category (auth, trade, security, etc.)';
COMMENT ON COLUMN audit_logs.action IS 'Action performed (create, update, delete, etc.)';
COMMENT ON COLUMN audit_logs.user_id IS 'User who performed the action (null for anonymous)';
COMMENT ON COLUMN audit_logs.user_email IS 'Denormalized email for easier querying';
COMMENT ON COLUMN audit_logs.ip_address IS 'Client IP address';
COMMENT ON COLUMN audit_logs.metadata IS 'Event-specific data (JSON)';
COMMENT ON COLUMN audit_logs.success IS 'Whether the action succeeded';

-- ============================================================================
-- Automatic Cleanup Function (Optional - Run via Cron)
-- ============================================================================

-- Clean up old audit logs (older than 90 days)
-- Run this monthly via Vercel Cron or external cron job

-- CREATE OR REPLACE FUNCTION cleanup_audit_logs()
-- RETURNS INTEGER AS $$
-- DECLARE
--   deleted_count INTEGER;
-- BEGIN
--   DELETE FROM audit_logs
--   WHERE timestamp < NOW() - INTERVAL '90 days'
--   AND category != 'security'; -- Keep security events longer
--   
--   GET DIAGNOSTICS deleted_count = ROW_COUNT;
--   RETURN deleted_count;
-- END;
-- $$ LANGUAGE plpgsql;

-- ============================================================================
-- Sample Queries
-- ============================================================================

-- Get recent audit logs for a user
-- SELECT * FROM audit_logs
-- WHERE user_id = 'USER_UUID'
-- ORDER BY timestamp DESC
-- LIMIT 100;

-- Get failed login attempts in last 24 hours
-- SELECT * FROM audit_logs
-- WHERE event = 'user.failed_login'
-- AND timestamp > NOW() - INTERVAL '24 hours'
-- ORDER BY timestamp DESC;

-- Get security events by IP address
-- SELECT * FROM audit_logs
-- WHERE category = 'security'
-- AND ip_address = '1.2.3.4'
-- ORDER BY timestamp DESC;

-- Get all trades by user in last 30 days
-- SELECT * FROM audit_logs
-- WHERE user_id = 'USER_UUID'
-- AND category = 'trade'
-- AND timestamp > NOW() - INTERVAL '30 days'
-- ORDER BY timestamp DESC;

-- Count events by category
-- SELECT category, COUNT(*) as count
-- FROM audit_logs
-- WHERE timestamp > NOW() - INTERVAL '7 days'
-- GROUP BY category
-- ORDER BY count DESC;

-- ============================================================================
-- Data Retention Policy
-- ============================================================================

-- Recommended retention periods:
-- - Security events: 90-365 days (longer for compliance)
-- - Trade actions: 365 days (tax purposes)
-- - Failed logins: 30 days
-- - User actions: 90 days

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
