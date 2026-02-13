/**
 * Audit Logging Service
 * 
 * Provides functions to log security events and user actions to the audit log.
 * 
 * Usage:
 * ```typescript
 * import { logAuditEvent, logAuthEvent, logTradeEvent } from '@/lib/security/audit-log';
 * 
 * // Generic event
 * await logAuditEvent({
 *   event: 'user.login',
 *   category: 'auth',
 *   action: 'login',
 *   userId: user.id,
 *   ipAddress: req.ip,
 *   success: 'true',
 * });
 * 
 * // Convenience wrapper
 * await logAuthEvent('login', {
 *   userId: user.id,
 *   ipAddress: req.ip,
 * });
 * ```
 */

import { db } from '@/db';
import {
  AUDIT_ACTIONS,
  AUDIT_CATEGORIES,
  AUDIT_EVENTS,
  auditLogs,
  NewAuditLog,
} from '@/db/audit-schema';
import { getClientIp } from '@/lib/utils/get-client-ip';
import { NextRequest } from 'next/server';

// ============================================================================
// Types
// ============================================================================

interface BaseAuditLogInput {
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  requestPath?: string;
  requestMethod?: string;
  metadata?: Record<string, any>;
  success?: 'true' | 'false';
  errorMessage?: string;
}

interface AuditLogInput extends BaseAuditLogInput {
  event: string;
  category: string;
  action: string;
}

// ============================================================================
// Core Logging Function
// ============================================================================

/**
 * Log an audit event to the database
 * 
 * @param input - Audit log data
 * @returns The created audit log entry
 * 
 * @example
 * ```typescript
 * await logAuditEvent({
 *   event: AUDIT_EVENTS.USER_LOGIN,
 *   category: AUDIT_CATEGORIES.AUTH,
 *   action: AUDIT_ACTIONS.LOGIN,
 *   userId: user.id,
 *   userEmail: user.email,
 *   ipAddress: getClientIp(request),
 *   userAgent: request.headers.get('user-agent') || undefined,
 *   success: 'true',
 * });
 * ```
 */
export async function logAuditEvent(input: AuditLogInput) {
  try {
    const [auditLog] = await db
      .insert(auditLogs)
      .values({
        event: input.event,
        category: input.category,
        action: input.action,
        userId: input.userId,
        userEmail: input.userEmail,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        requestPath: input.requestPath,
        requestMethod: input.requestMethod,
        metadata: input.metadata,
        success: input.success || 'true',
        errorMessage: input.errorMessage,
      } satisfies NewAuditLog)
      .returning();

    return auditLog;
  } catch (error) {
    // Don't throw - logging should never break the app
    console.error('Failed to log audit event:', error);
    return null;
  }
}

/**
 * Extract request metadata for audit logging
 * 
 * @param request - Next.js request object
 * @returns Request metadata
 */
export function extractRequestMetadata(request: NextRequest) {
  return {
    ipAddress: getClientIp(request),
    userAgent: request.headers.get('user-agent') || undefined,
    requestPath: request.nextUrl.pathname,
    requestMethod: request.method,
  };
}

// ============================================================================
// Convenience Wrappers - Authentication
// ============================================================================

/**
 * Log authentication events (login, logout, failed login)
 * 
 * @example
 * ```typescript
 * // Successful login
 * await logAuthEvent('login', {
 *   userId: user.id,
 *   userEmail: user.email,
 *   ipAddress: getClientIp(request),
 * });
 * 
 * // Failed login
 * await logAuthEvent('failed_login', {
 *   userEmail: email,
 *   ipAddress: getClientIp(request),
 *   success: 'false',
 *   errorMessage: 'Invalid credentials',
 * });
 * ```
 */
export async function logAuthEvent(
  action: 'login' | 'logout' | 'failed_login',
  input: BaseAuditLogInput
) {
  const eventMap = {
    login: AUDIT_EVENTS.USER_LOGIN,
    logout: AUDIT_EVENTS.USER_LOGOUT,
    failed_login: AUDIT_EVENTS.USER_FAILED_LOGIN,
  };

  return logAuditEvent({
    event: eventMap[action],
    category: AUDIT_CATEGORIES.AUTH,
    action: action === 'failed_login' ? AUDIT_ACTIONS.FAILED_LOGIN : AUDIT_ACTIONS[action.toUpperCase() as keyof typeof AUDIT_ACTIONS],
    ...input,
  });
}

// ============================================================================
// Convenience Wrappers - Trade Operations
// ============================================================================

/**
 * Log trade events (create, update, delete)
 * 
 * @example
 * ```typescript
 * await logTradeEvent('create', {
 *   userId: user.id,
 *   metadata: {
 *     tradeId: trade.id,
 *     instrumentId: trade.instrumentId,
 *     type: trade.type,
 *     quantity: trade.quantity.toString(),
 *     price: trade.price.toString(),
 *   },
 * });
 * ```
 */
export async function logTradeEvent(
  action: 'create' | 'update' | 'delete',
  input: BaseAuditLogInput
) {
  const eventMap = {
    create: AUDIT_EVENTS.TRADE_CREATED,
    update: AUDIT_EVENTS.TRADE_UPDATED,
    delete: AUDIT_EVENTS.TRADE_DELETED,
  };

  return logAuditEvent({
    event: eventMap[action],
    category: AUDIT_CATEGORIES.TRADE,
    action: AUDIT_ACTIONS[action.toUpperCase() as keyof typeof AUDIT_ACTIONS],
    ...input,
  });
}

// ============================================================================
// Convenience Wrappers - Security Events
// ============================================================================

/**
 * Log security events (rate limit exceeded, CSRF failed, etc.)
 * 
 * @example
 * ```typescript
 * await logSecurityEvent('rate_limit_exceeded', {
 *   ipAddress: getClientIp(request),
 *   metadata: {
 *     endpoint: '/api/trades',
 *     limit: 10,
 *     window: 60,
 *   },
 *   success: 'false',
 * });
 * ```
 */
export async function logSecurityEvent(
  action: 'rate_limit_exceeded' | 'csrf_failed' | 'unauthorized_access',
  input: BaseAuditLogInput
) {
  const eventMap = {
    rate_limit_exceeded: AUDIT_EVENTS.SECURITY_RATE_LIMIT_EXCEEDED,
    csrf_failed: AUDIT_EVENTS.SECURITY_CSRF_FAILED,
    unauthorized_access: AUDIT_EVENTS.SECURITY_UNAUTHORIZED_ACCESS,
  };

  return logAuditEvent({
    event: eventMap[action],
    category: AUDIT_CATEGORIES.SECURITY,
    action: AUDIT_ACTIONS[action.toUpperCase() as keyof typeof AUDIT_ACTIONS],
    success: 'false', // Security events are always failures
    ...input,
  });
}

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Get recent audit logs for a user
 * 
 * @param userId - User ID
 * @param limit - Number of logs to return (default: 100)
 * @returns Recent audit logs
 */
export async function getUserAuditLogs(userId: string, limit = 100) {
  const { eq, desc } = await import('drizzle-orm');

  return db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.userId, userId))
    .orderBy(desc(auditLogs.timestamp))
    .limit(limit);
}

/**
 * Get recent security events
 * 
 * @param limit - Number of logs to return (default: 100)
 * @returns Recent security events
 */
export async function getSecurityEvents(limit = 100) {
  const { eq, desc } = await import('drizzle-orm');

  return db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.category, AUDIT_CATEGORIES.SECURITY))
    .orderBy(desc(auditLogs.timestamp))
    .limit(limit);
}

/**
 * Get failed login attempts for an IP address (for rate limiting)
 * 
 * @param ipAddress - IP address
 * @param minutes - Time window in minutes (default: 15)
 * @returns Number of failed login attempts
 */
export async function getFailedLoginAttempts(
  ipAddress: string,
  minutes = 15
): Promise<number> {
  const { eq, and, gte } = await import('drizzle-orm');
  const since = new Date(Date.now() - minutes * 60 * 1000);

  const logs = await db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.event, AUDIT_EVENTS.USER_FAILED_LOGIN),
        eq(auditLogs.ipAddress, ipAddress),
        gte(auditLogs.timestamp, since)
      )
    );

  return logs.length;
}
