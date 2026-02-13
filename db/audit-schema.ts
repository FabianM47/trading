/**
 * Audit Logging Database Schema
 * 
 * Tracks critical security events and user actions for compliance and debugging.
 * 
 * Events logged:
 * - Authentication (login, logout, failed attempts)
 * - Trade operations (create, update, delete)
 * - Security events (rate limit exceeded, CSRF failures)
 * - User changes (profile updates, settings changes)
 */

import { sql } from 'drizzle-orm';
import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// ============================================================================
// Audit Log Table
// ============================================================================

export const auditLogs = pgTable(
  'audit_logs',
  {
    // Primary key
    id: uuid('id').primaryKey().defaultRandom(),

    // Event information
    event: text('event').notNull(), // e.g., 'user.login', 'trade.created', 'security.rate_limit_exceeded'
    category: text('category').notNull(), // e.g., 'auth', 'trade', 'security', 'user'
    action: text('action').notNull(), // e.g., 'create', 'update', 'delete', 'login', 'logout'

    // User information
    userId: uuid('user_id'), // Can be null for anonymous events
    userEmail: text('user_email'), // Denormalized for easier querying

    // Request information
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    requestPath: text('request_path'),
    requestMethod: text('request_method'), // GET, POST, PUT, DELETE, etc.

    // Event details (flexible JSON)
    metadata: jsonb('metadata'), // Event-specific data (e.g., trade details, error info)

    // Status
    success: text('success').notNull().default('true'), // 'true', 'false'
    errorMessage: text('error_message'), // Error message if success === 'false'

    // Timestamps
    timestamp: timestamp('timestamp', { withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    // Indexes for common queries
    userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
    eventIdx: index('audit_logs_event_idx').on(table.event),
    categoryIdx: index('audit_logs_category_idx').on(table.category),
    timestampIdx: index('audit_logs_timestamp_idx').on(table.timestamp),
    successIdx: index('audit_logs_success_idx').on(table.success),

    // Composite indexes for common filter combinations
    userEventIdx: index('audit_logs_user_event_idx').on(table.userId, table.event),
    categoryActionIdx: index('audit_logs_category_action_idx').on(table.category, table.action),
  })
);

// ============================================================================
// Types
// ============================================================================

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

// ============================================================================
// Event Categories & Actions (for type safety)
// ============================================================================

export const AUDIT_CATEGORIES = {
  AUTH: 'auth',
  TRADE: 'trade',
  POSITION: 'position',
  PORTFOLIO: 'portfolio',
  USER: 'user',
  SECURITY: 'security',
  SYSTEM: 'system',
} as const;

export const AUDIT_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LOGIN: 'login',
  LOGOUT: 'logout',
  FAILED_LOGIN: 'failed_login',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  CSRF_FAILED: 'csrf_failed',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
} as const;

// ============================================================================
// Predefined Events (for consistency)
// ============================================================================

export const AUDIT_EVENTS = {
  // Authentication
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_FAILED_LOGIN: 'user.failed_login',
  USER_SESSION_EXPIRED: 'user.session_expired',

  // Trades
  TRADE_CREATED: 'trade.created',
  TRADE_UPDATED: 'trade.updated',
  TRADE_DELETED: 'trade.deleted',

  // Positions
  POSITION_CREATED: 'position.created',
  POSITION_UPDATED: 'position.updated',
  POSITION_CLOSED: 'position.closed',

  // Portfolio
  PORTFOLIO_CREATED: 'portfolio.created',
  PORTFOLIO_UPDATED: 'portfolio.updated',
  PORTFOLIO_DELETED: 'portfolio.deleted',

  // User
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_PASSWORD_CHANGED: 'user.password_changed',
  USER_2FA_ENABLED: 'user.2fa_enabled',
  USER_2FA_DISABLED: 'user.2fa_disabled',

  // Security
  SECURITY_RATE_LIMIT_EXCEEDED: 'security.rate_limit_exceeded',
  SECURITY_CSRF_FAILED: 'security.csrf_failed',
  SECURITY_UNAUTHORIZED_ACCESS: 'security.unauthorized_access',
  SECURITY_SUSPICIOUS_ACTIVITY: 'security.suspicious_activity',
} as const;
