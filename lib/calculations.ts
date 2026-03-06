import type { Trade, TradeWithPnL, PortfolioSummary, MonthlyPnL, FilterOptions } from '@/types';
import { convertToEURSync } from './currencyConverter';

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
 * Berechnet P/L für einen einzelnen Trade (immer in EUR)
 * 
 * WICHTIG für Derivate:
 * Bei Hebel-Produkten ist der Hebel BEREITS IM DERIVATPREIS enthalten!
 * Man darf NICHT "Derivatpreisänderung × Hebel" rechnen.
 * 
 * WICHTIG für Multi-Currency:
 * - buyPrice wird anhand der Trade-Währung in EUR umgerechnet
 * - currentPrice kommt BEREITS in EUR von der API (dort umgerechnet)
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
  const currency = trade.currency || 'EUR';
  
  // buyPrice in EUR umrechnen (basierend auf Trade-Währung)
  const buyPriceEUR = convertToEURSync(trade.buyPrice, currency);
  
  // currentPrice kommt bereits in EUR von der API (dort umgerechnet)
  // Kein erneutes Umrechnen nötig!
  const currentPriceEUR = currentPrice;
  
  // Standard-Berechnung (gilt für Aktien UND Derivate)
  const pnlEur = roundTo2((currentPriceEUR - buyPriceEUR) * trade.quantity);
  const pnlPct = buyPriceEUR > 0 ? roundTo2(((currentPriceEUR / buyPriceEUR) - 1) * 100) : 0;

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
 * Konvertiert automatisch USD zu EUR
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
 * Alle Werte werden in EUR angezeigt (USD-Trades werden automatisch umgerechnet)
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

  // Konvertiere alle Werte zu EUR (synchron mit gecachtem Rate)
  // Hinweis: currentPrice kommt bereits in EUR von der API
  let totalInvested = 0;
  let totalValue = 0;
  
  for (const trade of trades) {
    const currency = trade.currency || 'EUR';
    const investedEUR = convertToEURSync(trade.investedEur, currency);
    // currentPrice ist bereits in EUR (API konvertiert), nicht nochmal umrechnen
    const valueEUR = trade.currentPrice * trade.quantity;
    
    totalInvested += investedEUR;
    totalValue += valueEUR;
  }
  
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
 * Konvertiert alle USD-Trades automatisch zu EUR
 */
export function calculateFullPortfolioSummary(
  allTrades: TradeWithPnL[],
  allTradesRaw?: Trade[]
): PortfolioSummary {
  const overall = calculatePortfolioSummary(allTrades, allTradesRaw);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  // Berechne monatliche Performance:
  // 1. Unrealisierte Gewinne von Trades, die in diesem Monat gekauft wurden
  const monthBoughtTrades = allTrades.filter((trade) => {
    const buyDate = new Date(trade.buyDate);
    return buyDate.getFullYear() === currentYear && buyDate.getMonth() === currentMonth && !trade.isClosed;
  });
  
  // 2. Realisierte Gewinne von Trades, die in diesem Monat geschlossen wurden
  const monthClosedTrades = allTrades.filter((trade) => {
    if (!trade.isClosed || !trade.closedAt) return false;
    const closedDate = new Date(trade.closedAt);
    return closedDate.getFullYear() === currentYear && closedDate.getMonth() === currentMonth;
  });
  
  // Berechne unrealisierten P/L von diesem Monat gekauften Trades
  const monthUnrealizedPnL = monthBoughtTrades.reduce((sum, trade) => sum + (trade.pnlEur || 0), 0);
  
  // Berechne realisierten P/L von diesem Monat geschlossenen Trades
  const monthRealizedPnL = monthClosedTrades.reduce((sum, trade) => sum + (trade.realizedPnL || 0), 0);
  
  // Gesamter monatlicher P/L
  const monthTotalPnL = monthUnrealizedPnL + monthRealizedPnL;
  
  // Berechne investiertes Kapital für Prozent-Berechnung
  const monthInvested = [...monthBoughtTrades, ...monthClosedTrades].reduce((sum, trade) => {
    return sum + (trade.investedEur || 0);
  }, 0);
  
  const monthPnlPct = monthInvested > 0 ? (monthTotalPnL / monthInvested) * 100 : 0;

  return {
    ...overall,
    monthPnlEur: monthTotalPnL,
    monthPnlPct: monthPnlPct,
  };
}

/**
 * Berechnet die monatliche P/L-Historie über alle Monate hinweg.
 * Pro Monat wird nur der realisierte Gewinn aus geschlossenen Trades berechnet.
 * 
 * Die Historie geht vom frühesten geschlossenen Trade bis zum aktuellen Monat.
 */
export function calculateMonthlyHistory(
  _tradesWithPnL: TradeWithPnL[],
  allTrades: Trade[]
): MonthlyPnL[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Finde den frühesten Monat aus Schließdaten
  const closedTrades = allTrades.filter(t => t.isClosed && t.closedAt);
  
  if (closedTrades.length === 0) {
    // Kein geschlossener Trade → nur aktuellen Monat mit 0 zurückgeben
    const monthNames = [
      'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];
    return [{
      year: currentYear,
      month: currentMonth,
      label: `${monthNames[currentMonth]} ${currentYear}`,
      pnlEur: 0,
      pnlPct: 0,
      realizedPnL: 0,
      investedAmount: 0,
      isCurrent: true,
    }];
  }

  let earliestDate = new Date();
  closedTrades.forEach(trade => {
    const closedDate = new Date(trade.closedAt!);
    if (closedDate < earliestDate) earliestDate = closedDate;
  });

  const startYear = earliestDate.getFullYear();
  const startMonth = earliestDate.getMonth();

  const monthNames = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];

  const history: MonthlyPnL[] = [];

  // Iteriere über alle Monate vom frühesten bis zum aktuellen
  let year = startYear;
  let month = startMonth;

  while (year < currentYear || (year === currentYear && month <= currentMonth)) {
    const isCurrent = year === currentYear && month === currentMonth;

    // Realisierte Gewinne: Trades die in diesem Monat geschlossen wurden
    const monthClosedTrades = closedTrades.filter(trade => {
      const closedDate = new Date(trade.closedAt!);
      return closedDate.getFullYear() === year && closedDate.getMonth() === month;
    });

    const realizedPnL = monthClosedTrades.reduce(
      (sum, trade) => sum + (trade.realizedPnL || 0), 0
    );

    // Investiertes Kapital für %-Berechnung
    const investedAmount = monthClosedTrades.reduce(
      (sum, trade) => sum + (trade.investedEur || 0), 0
    );

    const pnlPct = investedAmount > 0 ? (realizedPnL / investedAmount) * 100 : 0;

    // Nur Monate mit geschlossenen Trades oder aktuellen Monat aufnehmen
    if (monthClosedTrades.length > 0 || isCurrent) {
      history.push({
        year,
        month,
        label: `${monthNames[month]} ${year}`,
        pnlEur: roundTo2(realizedPnL),
        pnlPct: roundTo2(pnlPct),
        realizedPnL: roundTo2(realizedPnL),
        investedAmount: roundTo2(investedAmount),
        isCurrent,
      });
    }

    // Nächster Monat
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }

  // Neueste Monate zuerst
  return history.reverse();
}

/**
 * Berechnet den geschaetzten Derivatpreis bei einem Zielkurs des Basiswerts.
 *
 * Methode 1 (praezise): Wenn knockOut vorhanden ist, nutze die lineare
 * Knock-Out-Formel, bei der sich das Ratio rauskuerzt.
 * Methode 2 (Approximation): Wenn nur leverage vorhanden ist,
 * nutze die lineare Hebel-Naherung.
 */
export function estimateDerivativePrice(params: {
  currentDerivativePrice: number;
  currentUnderlyingPrice: number;
  targetUnderlyingPrice: number;
  knockOut?: number;
  optionType?: 'call' | 'put';
  leverage?: number;
}): { targetDerivativePrice: number; method: 'knockout' | 'leverage'; knockedOut: boolean } | null {
  const { currentDerivativePrice, currentUnderlyingPrice, targetUnderlyingPrice, knockOut, optionType, leverage } = params;

  if (currentDerivativePrice <= 0 || currentUnderlyingPrice <= 0) return null;

  const isCall = optionType !== 'put';

  // Methode 1: Knock-Out Formel (praezise fuer Turbos/KOs)
  if (knockOut != null && knockOut > 0) {
    // Knock-Out-Check
    if (isCall && targetUnderlyingPrice <= knockOut) {
      return { targetDerivativePrice: 0, method: 'knockout', knockedOut: true };
    }
    if (!isCall && targetUnderlyingPrice >= knockOut) {
      return { targetDerivativePrice: 0, method: 'knockout', knockedOut: true };
    }

    const currentIntrinsic = isCall
      ? currentUnderlyingPrice - knockOut
      : knockOut - currentUnderlyingPrice;

    if (currentIntrinsic <= 0) return null; // Daten inkonsistent

    const targetIntrinsic = isCall
      ? targetUnderlyingPrice - knockOut
      : knockOut - targetUnderlyingPrice;

    const targetPrice = roundTo2(currentDerivativePrice * (targetIntrinsic / currentIntrinsic));
    return { targetDerivativePrice: Math.max(0, targetPrice), method: 'knockout', knockedOut: false };
  }

  // Methode 2: Hebel-Approximation
  if (leverage && leverage > 0) {
    const underlyingChangePct = (targetUnderlyingPrice - currentUnderlyingPrice) / currentUnderlyingPrice;
    const direction = isCall ? 1 : -1;
    const derivativeChangePct = direction * underlyingChangePct * leverage;
    const targetPrice = roundTo2(currentDerivativePrice * (1 + derivativeChangePct));
    return { targetDerivativePrice: Math.max(0, targetPrice), method: 'leverage', knockedOut: false };
  }

  return null;
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
