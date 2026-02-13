/**
 * Custom Error Classes for Trading App
 * 
 * Provides type-safe error handling with consistent error responses.
 * Includes HTTP status codes and structured error messages.
 */

// ============================================================================
// Base Error Class
// ============================================================================

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public code?: string;
  public readonly details?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number,
    code?: string,
    details?: Record<string, any>,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;

    // Maintains proper stack trace (V8 engines only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // Set the prototype explicitly
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = this.constructor.name;
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      statusCode: this.statusCode,
    };
  }
}

// ============================================================================
// Validation Errors
// ============================================================================

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class ZodValidationError extends ValidationError {
  constructor(errors: any[]) {
    super('Validation failed', { errors });
  }
}

// ============================================================================
// Authentication & Authorization Errors
// ============================================================================

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 403, 'UNAUTHORIZED');
  }
}

export class SessionExpiredError extends AuthenticationError {
  constructor() {
    super('Session expired. Please log in again.');
    this.code = 'SESSION_EXPIRED';
  }
}

// ============================================================================
// Resource Errors
// ============================================================================

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with id '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND', { resource, identifier });
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 409, 'CONFLICT', details);
  }
}

// ============================================================================
// Rate Limiting & Security Errors
// ============================================================================

export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(retryAfter: number) {
    super('Too many requests. Please try again later.', 429, 'RATE_LIMIT_EXCEEDED', {
      retryAfter,
    });
    this.retryAfter = retryAfter;
  }
}

export class CsrfError extends AppError {
  constructor() {
    super('CSRF verification failed', 403, 'CSRF_FAILED');
  }
}

// ============================================================================
// Business Logic Errors
// ============================================================================

export class InsufficientBalanceError extends AppError {
  constructor(available: string, required: string) {
    super('Insufficient balance', 400, 'INSUFFICIENT_BALANCE', {
      available,
      required,
    });
  }
}

export class InvalidTradeError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 400, 'INVALID_TRADE', details);
  }
}

export class PositionNotFoundError extends NotFoundError {
  constructor(positionId: string) {
    super('Position', positionId);
  }
}

export class InstrumentNotFoundError extends NotFoundError {
  constructor(instrumentId: string) {
    super('Instrument', instrumentId);
  }
}

// ============================================================================
// External API Errors
// ============================================================================

export class ExternalApiError extends AppError {
  constructor(service: string, message: string, details?: Record<string, any>) {
    super(`External API error: ${service}`, 502, 'EXTERNAL_API_ERROR', {
      service,
      originalMessage: message,
      ...details,
    });
  }
}

export class StockApiError extends ExternalApiError {
  constructor(message: string, details?: Record<string, any>) {
    super('Stock API', message, details);
  }
}

// ============================================================================
// Server Errors
// ============================================================================

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error', details?: Record<string, any>) {
    super(message, 500, 'INTERNAL_SERVER_ERROR', details, false);
  }
}

export class DatabaseError extends InternalServerError {
  constructor(message: string, details?: Record<string, any>) {
    super(`Database error: ${message}`, details);
    this.code = 'DATABASE_ERROR';
  }
}

// ============================================================================
// Error Response Helper
// ============================================================================

/**
 * Convert an error to a JSON response
 * 
 * @param error - Error object
 * @param includeStack - Include stack trace (only in development)
 * @returns JSON response object
 */
export function errorToResponse(
  error: unknown,
  includeStack = process.env.NODE_ENV === 'development'
) {
  if (error instanceof AppError) {
    return {
      error: error.name,
      message: error.message,
      code: error.code,
      details: error.details,
      statusCode: error.statusCode,
      ...(includeStack && { stack: error.stack }),
    };
  }

  // Unknown error
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  const stack = error instanceof Error ? error.stack : undefined;

  return {
    error: 'InternalServerError',
    message,
    code: 'INTERNAL_SERVER_ERROR',
    statusCode: 500,
    ...(includeStack && { stack }),
  };
}

/**
 * Check if error is operational (safe to show to user)
 * 
 * @param error - Error object
 * @returns True if operational error
 */
export function isOperationalError(error: unknown): boolean {
  return error instanceof AppError && error.isOperational;
}
