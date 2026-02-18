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
import type { Trade } from '@/types';

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
    
    // Trade aus Request Body lesen
    const trade: Trade = await request.json();
    
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
    
    // Trade aus Request Body lesen
    const trade: Trade = await request.json();
    
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
