/**
 * Safe Logger Utility
 * 
 * Verhindert Logging von PII/Tokens in Production.
 * Sendet Errors zu Monitoring (Sentry, etc.) in Production.
 */

/**
 * Sanitize Error für Production Logging (entfernt sensible Daten)
 */
function sanitizeError(error: unknown): object {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      // Stack nur in Dev
      ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
    };
  }
  
  return { error: 'Unknown error' };
}

/**
 * Log Error mit Safe Filtering
 */
export function logError(message: string, error: unknown): void {
  if (process.env.NODE_ENV !== 'production') {
    // Dev: Full Error Details
    console.error(message, error);
    return;
  }
  
  // Production: Sanitized Error
  const safeError = sanitizeError(error);
  console.error(message, safeError);
  
  // TODO: Send to monitoring service (Sentry, Datadog, etc.)
  // Example:
  // Sentry.captureException(error, { extra: { message } });
}

/**
 * Log Warning mit Safe Filtering
 */
export function logWarning(message: string, data?: unknown): void {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(message, data);
    return;
  }
  
  // Production: Nur Message (keine Data)
  console.warn(message);
}

/**
 * Log Info (nur in Dev)
 */
export function logInfo(message: string, data?: unknown): void {
  if (process.env.NODE_ENV !== 'production') {
    console.log(message, data);
  }
}

/**
 * Log Debug (nur in Dev)
 */
export function logDebug(message: string, data?: unknown): void {
  if (process.env.NODE_ENV === 'development') {
    console.debug(message, data);
  }
}
