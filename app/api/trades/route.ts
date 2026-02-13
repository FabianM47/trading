/**
 * Example API Route with Full Security Implementation
 * 
 * This demonstrates how to use all security features:
 * - Rate limiting (Vercel KV)
 * - CSRF protection
 * - Input validation (Zod)
 * - Authentication check
 * - Audit logging
 * - Error handling
 * 
 * Copy this pattern for all your API routes!
 */

import { auth } from '@/auth';
import { AppError, errorToResponse, ValidationError } from '@/lib/errors/AppError';
import { createTradeRequestSchema } from '@/lib/schemas/trading.schema';
import {
  extractRequestMetadata,
  logSecurityEvent,
  logTradeEvent,
} from '@/lib/security/audit-log';
import { withCsrf } from '@/lib/security/csrf';
import { withRateLimit } from '@/lib/security/rate-limit-middleware';
import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// POST /api/trades - Create a new trade
// ============================================================================

async function handleCreateTrade(request: NextRequest) {
  try {
    // 1. Authentication Check
    const session = await auth();
    if (!session?.user?.id) {
      // Log unauthorized access attempt
      await logSecurityEvent('unauthorized_access', {
        ...extractRequestMetadata(request),
        errorMessage: 'Missing session',
      });

      throw new AppError('Unauthorized', 401);
    }

    const userId = session.user.id;

    // 2. Parse and Validate Input
    const body = await request.json();
    const validation = createTradeRequestSchema.safeParse(body);

    if (!validation.success) {
      throw new ValidationError('Invalid trade data', {
        errors: validation.error.format(),
      });
    }

    const tradeData = validation.data;

    // 3. Business Logic (example - replace with actual implementation)
    // TODO: Implement actual trade creation
    const trade = {
      id: crypto.randomUUID(),
      userId,
      ...tradeData,
      createdAt: new Date().toISOString(),
    };

    // 4. Audit Logging
    await logTradeEvent('create', {
      userId,
      userEmail: session.user.email || undefined,
      ...extractRequestMetadata(request),
      metadata: {
        tradeId: trade.id,
        instrumentId: tradeData.instrumentId,
        tradeType: tradeData.tradeType,
        quantity: tradeData.quantity,
        pricePerUnit: tradeData.pricePerUnit,
      },
      success: 'true',
    });

    // 5. Return Success Response
    return NextResponse.json(
      {
        success: true,
        data: trade,
      },
      { status: 201 }
    );
  } catch (error) {
    // 6. Error Handling
    console.error('Trade creation error:', error);

    // Log error to audit log
    const session = await auth();
    await logTradeEvent('create', {
      userId: session?.user?.id,
      userEmail: session?.user?.email || undefined,
      ...extractRequestMetadata(request),
      success: 'false',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    // Return error response
    const errorResponse = errorToResponse(error);
    return NextResponse.json(
      {
        success: false,
        ...errorResponse,
      },
      { status: errorResponse.statusCode }
    );
  }
}

// Apply security middleware
export const POST = withRateLimit(
  withCsrf(handleCreateTrade),
  {
    type: 'TRADE_CREATION',
  }
);

// ============================================================================
// GET /api/trades - List trades for current user
// ============================================================================

async function handleListTrades(request: NextRequest) {
  try {
    // 1. Authentication Check
    const session = await auth();
    if (!session?.user?.id) {
      throw new AppError('Unauthorized', 401);
    }

    const userId = session.user.id;

    // 2. Parse Query Parameters
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const portfolioId = searchParams.get('portfolioId');

    // 3. Business Logic (example - replace with actual implementation)
    // TODO: Implement actual trade fetching from database
    const trades = [
      {
        id: '1',
        userId,
        portfolioId: portfolioId || 'default',
        type: 'buy',
        quantity: '10',
        price: '150.00',
        createdAt: new Date().toISOString(),
      },
    ];

    // 4. Return Success Response
    return NextResponse.json({
      success: true,
      data: trades,
      pagination: {
        page,
        limit,
        total: trades.length,
      },
    });
  } catch (error) {
    console.error('Trade list error:', error);

    const errorResponse = errorToResponse(error);
    return NextResponse.json(
      {
        success: false,
        ...errorResponse,
      },
      { status: errorResponse.statusCode }
    );
  }
}

// Rate limit GET requests (more generous than POST)
export const GET = withRateLimit(handleListTrades, {
  type: 'AUTHENTICATED',
});
