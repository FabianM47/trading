import type { Trade, TradeWithPnL, PortfolioSummary, FilterOptions } from '@/types';

/**
 * Rundet eine Zahl auf 2 Nachkommastellen
 */
export function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Berechnet P/L für einen einzelnen Trade
 */
export function calculateTradePnL(
  trade: Trade,
  currentPrice: number
): { pnlEur: number; pnlPct: number } {
  const pnlEur = roundTo2((currentPrice - trade.buyPrice) * trade.quantity);
  const pnlPct = roundTo2(((currentPrice / trade.buyPrice) - 1) * 100);

  return { pnlEur, pnlPct };
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
 */
export function calculatePortfolioSummary(
  trades: TradeWithPnL[]
): Omit<PortfolioSummary, 'monthPnlEur' | 'monthPnlPct'> {
  if (trades.length === 0) {
    return {
      totalInvested: 0,
      totalValue: 0,
      pnlEur: 0,
      pnlPct: 0,
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

  return {
    totalInvested: roundTo2(totalInvested),
    totalValue: roundTo2(totalValue),
    pnlEur,
    pnlPct,
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
  allTrades: TradeWithPnL[]
): PortfolioSummary {
  const overall = calculatePortfolioSummary(allTrades);
  const now = new Date();
  const monthTrades = filterTradesByMonth(
    allTrades,
    now.getFullYear(),
    now.getMonth()
  );
  const monthSummary = calculatePortfolioSummary(monthTrades);

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
