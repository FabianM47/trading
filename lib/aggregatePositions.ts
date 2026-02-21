import type { Trade, AggregatedPosition, Quote } from '@/types';

/**
 * Gruppiert alle Trades nach Symbol/ISIN und berechnet aggregierte Positionsdaten.
 * 
 * Logik:
 * - Trades werden nach ISIN oder Ticker gruppiert
 * - Offene Trades: Gewichteter Durchschnittspreis berechnen
 * - Geschlossene Trades: Realisierte P/L summieren
 * - Gesamt-P/L = Unrealisierte P/L + Realisierte P/L
 */
export function aggregatePositions(
  trades: Trade[],
  quotes: Record<string, Quote>
): AggregatedPosition[] {
  if (!trades || trades.length === 0) {
    return [];
  }

  // Gruppiere Trades nach Symbol (ISIN bevorzugt, sonst Ticker)
  const grouped = new Map<string, Trade[]>();
  
  trades.forEach(trade => {
    const key = trade.isin || trade.ticker || '';
    if (!key) return; // Skip trades ohne Identifier
    
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(trade);
  });

  // Für jede Gruppe: Aggregiere die Daten
  const positions: AggregatedPosition[] = [];

  grouped.forEach((tradesToAggregate, key) => {
    if (tradesToAggregate.length === 0) return;

    // Trenne offene und geschlossene Trades
    const openTrades = tradesToAggregate.filter(t => !t.isClosed);
    const closedTrades = tradesToAggregate.filter(t => t.isClosed);

    // ⚠️ Überspringe Positionen ohne offene Trades (komplett geschlossen)
    if (openTrades.length === 0) return;

    // Basis-Informationen vom ersten Trade
    const firstTrade = tradesToAggregate[0];
    const symbol = firstTrade.ticker || firstTrade.isin || '';
    const isin = firstTrade.isin;
    const name = firstTrade.name;
    const currency = firstTrade.currency || 'EUR';

    // Finde aktuellen Preis (aus Quote oder letztem bekannten Preis)
    const quote = quotes[key];
    const currentPrice = quote?.price || firstTrade.currentPrice || 0;

    // Berechne Werte für OFFENE Trades
    let totalQuantity = 0;
    let totalInvested = 0;

    openTrades.forEach(trade => {
      totalQuantity += trade.quantity;
      totalInvested += trade.investedEur;
    });

    // Gewichteter Durchschnittspreis (nur für offene Trades)
    const averageBuyPrice = totalQuantity > 0 ? totalInvested / totalQuantity : 0;

    // Aktueller Gesamtwert der offenen Position
    const currentValue = totalQuantity * currentPrice;

    // Unrealisierte P/L (nur offene Trades)
    const unrealizedPnL = currentValue - totalInvested;

    // Realisierte P/L (aus geschlossenen Trades)
    const realizedPnL = closedTrades.reduce((sum, trade) => {
      return sum + (trade.realizedPnL || 0);
    }, 0);

    // Gesamt P/L
    const totalPnL = unrealizedPnL + realizedPnL;
    const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    // Datumsinformationen
    const allDates = tradesToAggregate
      .map(t => new Date(t.buyDate).getTime())
      .filter(d => !isNaN(d));
    
    const firstBuyDate = allDates.length > 0 
      ? new Date(Math.min(...allDates)).toISOString()
      : firstTrade.buyDate;
    
    const lastBuyDate = allDates.length > 0
      ? new Date(Math.max(...allDates)).toISOString()
      : firstTrade.buyDate;

    // Derivate-Informationen (falls vorhanden)
    const isDerivative = firstTrade.isDerivative;
    const leverage = firstTrade.leverage;
    const productType = firstTrade.productType;

    positions.push({
      symbol,
      isin,
      name,
      ticker: symbol,
      totalQuantity,
      averageBuyPrice,
      totalInvested,
      currentPrice,
      currentValue,
      currency,
      totalPnL,
      totalPnLPercent,
      realizedPnL,
      unrealizedPnL,
      trades: tradesToAggregate,
      openTrades,
      closedTrades,
      firstBuyDate,
      lastBuyDate,
      isDerivative,
      leverage,
      productType,
    });
  });

  // Sortiere nach Gesamtwert (absteigend)
  return positions.sort((a, b) => b.currentValue - a.currentValue);
}

/**
 * Hilfsfunktion: Finde Position anhand von Symbol/ISIN
 */
export function findPosition(
  positions: AggregatedPosition[],
  symbolOrIsin: string
): AggregatedPosition | undefined {
  return positions.find(
    p => p.symbol === symbolOrIsin || p.isin === symbolOrIsin
  );
}

/**
 * Hilfsfunktion: Extrahiere alle eindeutigen Symbole/ISINs für Quote-Abfrage
 */
export function getUniqueSymbols(positions: AggregatedPosition[]): string[] {
  const symbols = new Set<string>();
  
  positions.forEach(position => {
    if (position.isin) symbols.add(position.isin);
    if (position.ticker) symbols.add(position.ticker);
  });
  
  return Array.from(symbols);
}
