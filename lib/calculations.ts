import type { Trade, TradeWithPnL, PortfolioSummary, FilterOptions } from '@/types';

/**
 * Rundet eine Zahl auf 2 Nachkommastellen
 */
export function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Berechnet den realisierten Gewinn für einen geschlossenen Trade
 */
export function calculateRealizedPnL(
  trade: Trade,
  sellPrice?: number,
  sellTotal?: number
): number {
  // If sellTotal is provided, use it directly
  if (sellTotal !== undefined) {
    return roundTo2(sellTotal - trade.investedEur);
  }
  
  // If sellPrice is provided, calculate from price per share
  if (sellPrice !== undefined) {
    const totalSellValue = sellPrice * trade.quantity;
    return roundTo2(totalSellValue - trade.investedEur);
  }
  
  return 0;
}

/**
 * Berechnet die Summe aller realisierten Gewinne
 */
export function calculateTotalRealizedPnL(trades: Trade[]): number {
  const realizedPnL = trades
    .filter(t => t.isClosed && t.realizedPnL !== undefined)
    .reduce((sum, t) => sum + (t.realizedPnL || 0), 0);
  
  return roundTo2(realizedPnL);
}

/**
 * Berechnet P/L für einen einzelnen Trade
 * 
 * WICHTIG für Derivate:
 * Bei Hebel-Produkten ist der Hebel BEREITS IM DERIVATPREIS enthalten!
 * Man darf NICHT "Derivatpreisänderung × Hebel" rechnen.
 * 
 * Beispiel:
 * - Derivat gekauft bei 0,30€ (Hebel 5x auf DAX)
 * - Derivat jetzt bei 0,40€
 * - Gewinn = (0,40 - 0,30) × Menge
 * 
 * Der Hebel ist bereits in der Preisbewegung 0,30→0,40 enthalten!
 */
export function calculateTradePnL(
  trade: Trade,
  currentPrice: number
): { pnlEur: number; pnlPct: number } {
  // Standard-Berechnung (gilt für Aktien UND Derivate)
  const pnlEur = roundTo2((currentPrice - trade.buyPrice) * trade.quantity);
  const pnlPct = roundTo2(((currentPrice / trade.buyPrice) - 1) * 100);

  return { pnlEur, pnlPct };
}

/**
 * Berechnet die theoretische Performance basierend auf Hebel
 * (Nur für Info/Anzeige, NICHT für echte P/L Berechnung!)
 * 
 * @param underlyingPriceChange Prozentuale Änderung des Basiswerts (z.B. DAX +2%)
 * @param leverage Hebel des Derivats (z.B. 5)
 * @returns Erwartete prozentuale Änderung des Derivats
 */
export function calculateLeveragedReturn(
  underlyingPriceChange: number,
  leverage: number
): number {
  return roundTo2(underlyingPriceChange * leverage);
}

/**
 * Berechnet Hebel-Effekt-Informationen für UI-Anzeige
 * 
 * @param trade Der Trade (muss isDerivative = true und leverage haben)
 * @param currentPrice Aktueller Preis des Derivats
 * @returns Hebel-Informationen zur Anzeige
 */
export function calculateDerivativeLeverageInfo(
  trade: Trade,
  currentPrice: number
): {
  actualPnLPct: number;          // Tatsächlicher Gewinn/Verlust in %
  derivativePriceChange: number; // Preisänderung des Derivats in %
  impliedUnderlyingChange: number; // Implizierte Änderung des Basiswerts in %
} | null {
  if (!trade.isDerivative || !trade.leverage || trade.leverage <= 1) {
    return null;
  }

  // Preisänderung des Derivats
  const derivativePriceChange = roundTo2(((currentPrice / trade.buyPrice) - 1) * 100);
  
  // Implizierte Änderung des Basiswerts (Derivat-Änderung / Hebel)
  const impliedUnderlyingChange = roundTo2(derivativePriceChange / trade.leverage);
  
  return {
    actualPnLPct: derivativePriceChange,
    derivativePriceChange,
    impliedUnderlyingChange,
  };
}

/**
 * Erstellt TradeWithPnL aus Trade und aktuellem Kurs
 */
export function enrichTradeWithPnL(
  trade: Trade,
  currentPrice: number
): TradeWithPnL {
  const { pnlEur, pnlPct } = calculateTradePnL(trade, currentPrice);

  return {
    ...trade,
    currentPrice,
    pnlEur,
    pnlPct,
  };
}

/**
 * Berechnet Portfolio-Zusammenfassung aus Trades mit P/L
 * Hinweis: realizedPnL muss separat über alle Trades (inkl. geschlossener) berechnet werden
 */
export function calculatePortfolioSummary(
  trades: TradeWithPnL[],
  allTrades?: Trade[]
): Omit<PortfolioSummary, 'monthPnlEur' | 'monthPnlPct'> {
  if (trades.length === 0) {
    const realizedPnL = allTrades ? calculateTotalRealizedPnL(allTrades) : 0;
    return {
      totalInvested: 0,
      totalValue: 0,
      pnlEur: 0,
      pnlPct: 0,
      realizedPnL,
      totalPnL: realizedPnL,
    };
  }

  const totalInvested = trades.reduce((sum, t) => sum + t.investedEur, 0);
  const totalValue = trades.reduce(
    (sum, t) => sum + t.currentPrice * t.quantity,
    0
  );
  const pnlEur = roundTo2(trades.reduce((sum, t) => sum + t.pnlEur, 0));
  const pnlPct =
    totalInvested > 0
      ? roundTo2(((totalValue / totalInvested) - 1) * 100)
      : 0;

  const realizedPnL = allTrades ? calculateTotalRealizedPnL(allTrades) : 0;
  const totalPnL = roundTo2(pnlEur + realizedPnL);

  return {
    totalInvested: roundTo2(totalInvested),
    totalValue: roundTo2(totalValue),
    pnlEur,
    pnlPct,
    realizedPnL,
    totalPnL,
  };
}

/**
 * Filtert Trades nach Monat
 */
export function filterTradesByMonth(
  trades: TradeWithPnL[],
  year: number,
  month: number // 0-11 (JS Date format)
): TradeWithPnL[] {
  return trades.filter((trade) => {
    const tradeDate = new Date(trade.buyDate);
    return (
      tradeDate.getFullYear() === year && tradeDate.getMonth() === month
    );
  });
}

/**
 * Filtert Trades nach Zeitraum
 */
export function filterTradesByTimeRange(
  trades: TradeWithPnL[],
  timeRange: FilterOptions['timeRange'],
  customStart?: string,
  customEnd?: string
): TradeWithPnL[] {
  const now = new Date();

  switch (timeRange) {
    case 'month': {
      return filterTradesByMonth(trades, now.getFullYear(), now.getMonth());
    }

    case 'last30': {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return trades.filter(
        (t) => new Date(t.buyDate) >= thirtyDaysAgo
      );
    }

    case 'ytd': {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      return trades.filter((t) => new Date(t.buyDate) >= yearStart);
    }

    case 'custom': {
      if (!customStart || !customEnd) return trades;
      const start = new Date(customStart);
      const end = new Date(customEnd);
      return trades.filter((t) => {
        const date = new Date(t.buyDate);
        return date >= start && date <= end;
      });
    }

    case 'all':
    default:
      return trades;
  }
}

/**
 * Filtert Trades nach Suchbegriff (Name, Ticker, ISIN)
 */
export function filterTradesBySearch(
  trades: TradeWithPnL[],
  searchQuery: string
): TradeWithPnL[] {
  if (!searchQuery.trim()) return trades;

  const query = searchQuery.toLowerCase();
  return trades.filter(
    (t) =>
      t.name.toLowerCase().includes(query) ||
      t.isin.toLowerCase().includes(query) ||
      (t.ticker && t.ticker.toLowerCase().includes(query))
  );
}

/**
 * Filtert nur gewinnbringende Trades
 */
export function filterOnlyWinners(trades: TradeWithPnL[]): TradeWithPnL[] {
  return trades.filter((t) => t.pnlEur > 0);
}

/**
 * Sortiert Trades
 */
export function sortTrades(
  trades: TradeWithPnL[],
  sortBy: FilterOptions['sortBy']
): TradeWithPnL[] {
  const sorted = [...trades];

  switch (sortBy) {
    case 'pnlEur':
      return sorted.sort((a, b) => b.pnlEur - a.pnlEur);

    case 'pnlPct':
      return sorted.sort((a, b) => b.pnlPct - a.pnlPct);

    case 'date':
      return sorted.sort(
        (a, b) =>
          new Date(b.buyDate).getTime() - new Date(a.buyDate).getTime()
      );

    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));

    default:
      return sorted;
  }
}

/**
 * Wendet alle Filter an
 */
export function applyFilters(
  trades: TradeWithPnL[],
  filters: FilterOptions
): TradeWithPnL[] {
  let filtered = trades;

  // Zeitraum
  filtered = filterTradesByTimeRange(
    filtered,
    filters.timeRange,
    filters.customStart,
    filters.customEnd
  );

  // Suche
  filtered = filterTradesBySearch(filtered, filters.searchQuery);

  // Nur Gewinner
  if (filters.onlyWinners) {
    filtered = filterOnlyWinners(filtered);
  }

  // Sortierung
  filtered = sortTrades(filtered, filters.sortBy);

  return filtered;
}

/**
 * Berechnet vollständige Portfolio-Zusammenfassung inkl. Monatsauswertung
 */
export function calculateFullPortfolioSummary(
  allTrades: TradeWithPnL[],
  allTradesRaw?: Trade[]
): PortfolioSummary {
  const overall = calculatePortfolioSummary(allTrades, allTradesRaw);
  const now = new Date();
  const monthTrades = filterTradesByMonth(
    allTrades,
    now.getFullYear(),
    now.getMonth()
  );
  const monthSummary = calculatePortfolioSummary(monthTrades, allTradesRaw);

  return {
    ...overall,
    monthPnlEur: monthSummary.pnlEur,
    monthPnlPct: monthSummary.pnlPct,
  };
}

/**
 * Bestimmt Farbklasse basierend auf P/L
 */
export function getPnLColorClass(pnl: number): string {
  if (pnl > 0) return 'text-profit';
  if (pnl < 0) return 'text-loss';
  return 'text-text-secondary';
}

/**
 * Bestimmt Badge-Klassen (Hintergrund + Text) basierend auf P/L
 */
export function getPnLBadgeClass(pnl: number): string {
  if (pnl > 0) return 'bg-profit-bg text-profit';
  if (pnl < 0) return 'bg-loss-bg text-loss';
  return 'bg-neutral-bg text-neutral';
}

/**
 * Formatiert Währung
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

/**
 * Formatiert Prozent
 */
export function formatPercent(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}
