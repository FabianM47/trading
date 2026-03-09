/**
 * Trades API Route
 * 
 * Verwaltet alle CRUD-Operationen für Trades in Supabase.
 * Alle Operationen sind benutzerspezifisch basierend auf der Logto-Authentifizierung.
 * 
 * GET /api/trades - Lädt alle Trades des authentifizierten Benutzers
 * POST /api/trades - Erstellt einen neuen Trade
 * PUT /api/trades - Aktualisiert einen bestehenden Trade
 * DELETE /api/trades - Löscht einen Trade
 */

import { NextRequest, NextResponse } from 'next/server';
import LogtoClient from '@logto/next/server-actions';
import { logtoConfig } from '@/lib/auth/logto-config';
import { supabase } from '@/lib/supabase';
import { logError, logInfo } from '@/lib/logger';
import { z } from 'zod';
import type { Trade } from '@/types';

// ── Input Validation Schemas ──────────────────────────────────────

const PartialSaleSchema = z.object({
  id: z.string().min(1).max(100),
  soldQuantity: z.number().positive(),
  sellPrice: z.number().positive(),
  sellTotal: z.number(),
  realizedPnL: z.number(),
  soldAt: z.string(),
});

const TradeSchema = z.object({
  id: z.string().min(1).max(100),
  isin: z.string().max(30),
  ticker: z.string().max(30).optional().nullable(),
  name: z.string().min(1).max(200),
  buyPrice: z.number().positive(),
  quantity: z.number().positive(),
  investedEur: z.number(),
  buyDate: z.string(),
  currentPrice: z.number().optional().nullable(),
  currency: z.enum(['EUR', 'USD']).optional().nullable(),
  priceProvider: z.string().max(50).optional().nullable(),

  // Derivate
  isDerivative: z.boolean().optional().nullable(),
  leverage: z.number().optional().nullable(),
  productType: z.string().max(50).optional().nullable(),
  underlying: z.string().max(200).optional().nullable(),
  knockOut: z.number().optional().nullable(),
  optionType: z.string().max(20).optional().nullable(),

  // Demo/Test Trade
  isDemo: z.boolean().optional().nullable(),

  // Teilverkäufe
  originalQuantity: z.number().positive().optional().nullable(),
  partialSales: z.array(PartialSaleSchema).optional().default([]),

  // Verkauf
  isClosed: z.boolean().optional().nullable(),
  closedAt: z.string().optional().nullable(),
  sellPrice: z.number().optional().nullable(),
  sellTotal: z.number().optional().nullable(),
  realizedPnL: z.number().optional().nullable(),
  isPartialSale: z.boolean().optional().nullable(),
  parentTradeId: z.string().max(100).optional().nullable(),
});

/**
 * Hilfsfunktion: Konvertiert Supabase Row zu Trade Object
 */
function dbRowToTrade(row: any): Trade {
  return {
    id: row.trade_id,
    isin: row.isin,
    ticker: row.ticker,
    name: row.name,
    buyPrice: parseFloat(row.buy_price),
    quantity: parseFloat(row.quantity),
    investedEur: parseFloat(row.invested_eur),
    buyDate: row.buy_date,
    currentPrice: row.current_price ? parseFloat(row.current_price) : undefined,
    currency: row.currency,
    priceProvider: row.price_provider,

    // Demo/Test Trade
    isDemo: row.is_demo,

    // Derivate-Felder
    isDerivative: row.is_derivative,
    leverage: row.leverage ? parseFloat(row.leverage) : undefined,
    productType: row.product_type,
    underlying: row.underlying,
    knockOut: row.knock_out ? parseFloat(row.knock_out) : undefined,
    optionType: row.option_type,
    
    // Teilverkauf-Felder
    originalQuantity: row.original_quantity ? parseFloat(row.original_quantity) : undefined,
    partialSales: row.partial_sales || [],
    
    // Verkaufs-Felder
    isClosed: row.is_closed,
    closedAt: row.closed_at,
    sellPrice: row.sell_price ? parseFloat(row.sell_price) : undefined,
    sellTotal: row.sell_total ? parseFloat(row.sell_total) : undefined,
    realizedPnL: row.realized_pnl ? parseFloat(row.realized_pnl) : undefined,
    isPartialSale: row.is_partial_sale,
    parentTradeId: row.parent_trade_id,
  };
}

/**
 * Hilfsfunktion: Konvertiert Trade Object zu Supabase Row
 */
function tradeToDbRow(trade: Trade, userId: string) {
  return {
    user_id: userId,
    trade_id: trade.id,
    isin: trade.isin,
    ticker: trade.ticker,
    name: trade.name,
    buy_price: trade.buyPrice,
    quantity: trade.quantity,
    invested_eur: trade.investedEur,
    buy_date: trade.buyDate,
    current_price: trade.currentPrice,
    currency: trade.currency,
    price_provider: trade.priceProvider,

    // Demo/Test Trade
    is_demo: trade.isDemo,

    // Derivate-Felder
    is_derivative: trade.isDerivative,
    leverage: trade.leverage,
    product_type: trade.productType,
    underlying: trade.underlying,
    knock_out: trade.knockOut,
    option_type: trade.optionType,
    
    // Teilverkauf-Felder
    original_quantity: trade.originalQuantity,
    partial_sales: trade.partialSales || [],
    
    // Verkaufs-Felder
    is_closed: trade.isClosed,
    closed_at: trade.closedAt,
    sell_price: trade.sellPrice,
    sell_total: trade.sellTotal,
    realized_pnl: trade.realizedPnL,
    is_partial_sale: trade.isPartialSale,
    parent_trade_id: trade.parentTradeId,
  };
}

/**
 * GET /api/trades
 * Lädt alle Trades des authentifizierten Benutzers
 */
export async function GET() {
  try {
    // Authentifizierung prüfen
    const client = new LogtoClient(logtoConfig);
    const context = await client.getLogtoContext();
    
    if (!context.isAuthenticated || !context.claims?.sub) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = context.claims.sub;
    
    // Trades aus Supabase laden
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('buy_date', { ascending: false });
    
    if (error) {
      logError('❌ Supabase GET error', error);
      return NextResponse.json(
        { error: 'Failed to fetch trades' },
        { status: 500 }
      );
    }
    
    // Konvertiere DB Rows zu Trade Objects
    const trades = (data || []).map(dbRowToTrade);
    
    logInfo(`✅ Loaded ${trades.length} trades for user ${userId}`);
    
    return NextResponse.json({ trades });
  } catch (error) {
    logError('❌ GET /api/trades error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trades
 * Erstellt einen neuen Trade
 */
export async function POST(request: NextRequest) {
  try {
    // Authentifizierung prüfen
    const client = new LogtoClient(logtoConfig);
    const context = await client.getLogtoContext();
    
    if (!context.isAuthenticated || !context.claims?.sub) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = context.claims.sub;
    
    // Trade aus Request Body lesen und validieren
    const body = await request.json();
    const parsed = TradeSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid trade data', details: parsed.error.errors },
        { status: 400 }
      );
    }
    
    const trade = parsed.data as unknown as Trade;
    
    // In Supabase speichern
    const { data, error } = await supabase
      .from('trades')
      .insert([tradeToDbRow(trade, userId)])
      .select()
      .single();
    
    if (error) {
      logError('❌ Supabase POST error', error);
      return NextResponse.json(
        { error: 'Failed to create trade' },
        { status: 500 }
      );
    }
    
    const createdTrade = dbRowToTrade(data);

    logInfo(`✅ Created trade ${trade.id} for user ${userId}`);

    // Chat-Benachrichtigung bei neuem nicht-Demo Trade (fire-and-forget)
    if (!trade.isDemo) {
      notifyTradeInChat(userId, trade).catch(err =>
        console.error('[Trade] Chat notification error:', err)
      );
    }

    return NextResponse.json({ trade: createdTrade }, { status: 201 });
  } catch (error) {
    logError('❌ POST /api/trades error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/trades
 * Aktualisiert einen bestehenden Trade
 */
export async function PUT(request: NextRequest) {
  try {
    // Authentifizierung prüfen
    const client = new LogtoClient(logtoConfig);
    const context = await client.getLogtoContext();
    
    if (!context.isAuthenticated || !context.claims?.sub) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = context.claims.sub;
    
    // Trade aus Request Body lesen und validieren
    const body = await request.json();
    const parsed = TradeSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid trade data', details: parsed.error.errors },
        { status: 400 }
      );
    }
    
    const trade = parsed.data as unknown as Trade;
    
    // In Supabase aktualisieren
    const { data, error } = await supabase
      .from('trades')
      .update(tradeToDbRow(trade, userId))
      .eq('user_id', userId)
      .eq('trade_id', trade.id)
      .select()
      .single();
    
    if (error) {
      logError('❌ Supabase PUT error', error);
      return NextResponse.json(
        { error: 'Failed to update trade' },
        { status: 500 }
      );
    }
    
    if (!data) {
      return NextResponse.json(
        { error: 'Trade not found' },
        { status: 404 }
      );
    }
    
    const updatedTrade = dbRowToTrade(data);
    
    logInfo(`✅ Updated trade ${trade.id} for user ${userId}`);
    
    return NextResponse.json({ trade: updatedTrade });
  } catch (error) {
    logError('❌ PUT /api/trades error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/trades
 * Löscht einen Trade
 */
export async function DELETE(request: NextRequest) {
  try {
    // Authentifizierung prüfen
    const client = new LogtoClient(logtoConfig);
    const context = await client.getLogtoContext();
    
    if (!context.isAuthenticated || !context.claims?.sub) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = context.claims.sub;
    
    // Trade ID aus Query Parameter lesen
    const { searchParams } = new URL(request.url);
    const tradeId = searchParams.get('id');
    
    if (!tradeId) {
      return NextResponse.json(
        { error: 'Trade ID is required' },
        { status: 400 }
      );
    }
    
    // Aus Supabase löschen
    const { error } = await supabase
      .from('trades')
      .delete()
      .eq('user_id', userId)
      .eq('trade_id', tradeId);
    
    if (error) {
      logError('❌ Supabase DELETE error', error);
      return NextResponse.json(
        { error: 'Failed to delete trade' },
        { status: 500 }
      );
    }
    
    logInfo(`✅ Deleted trade ${tradeId} for user ${userId}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    logError('❌ DELETE /api/trades error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Sendet eine Chat-Nachricht wenn ein neuer Trade erstellt wird.
 * Nur an User mit aktivierter trade_notifications Einstellung.
 */
async function notifyTradeInChat(userId: string, trade: Trade) {
  // Prüfe ob der User Trade-Benachrichtigungen aktiviert hat
  const { data: settings } = await supabase
    .from('user_settings')
    .select('trade_notifications')
    .eq('user_id', userId)
    .single();

  // Default ist true (aktiviert), nur überspringen wenn explizit deaktiviert
  if (settings?.trade_notifications === false) return;

  // Username des Trade-Erstellers laden
  const { data: chatUser } = await supabase
    .from('chat_users')
    .select('username')
    .eq('user_id', userId)
    .single();

  if (!chatUser?.username) return;

  const priceFormatted = trade.buyPrice.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const currency = trade.currency || 'EUR';

  const message = `📈 ${chatUser.username} hat ${trade.quantity}x ${trade.name} (${trade.isin}) zu ${priceFormatted} ${currency} gekauft`;

  // Nachricht als System-Nachricht in den Chat einfügen
  await supabase
    .from('chat_messages')
    .insert({
      sender_id: userId,
      content: message,
    });
}
