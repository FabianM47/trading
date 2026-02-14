/**
 * Portfolio Calculation Functions (Pure & Testable)
 * 
 * Uses Average Cost Method for realized P/L
 * All calculations use decimal.js to avoid floating-point errors
 * 
 * @see tests/lib/portfolio/calculations.test.ts
 */

import Decimal from 'decimal.js';

// Configure Decimal.js for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ============================================================================
// Types
// ============================================================================

export interface Trade {
  id: string;
  instrumentId: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  fees: number;
  executedAt: Date;
  portfolioId: string;
}

export interface Position {
  instrumentId: string;
  symbol: string;
  isin: string;
  name: string;

  /** Current open quantity */
  quantity: number;

  /** Weighted average cost per unit */
  avgCost: number;

  /** Total cost basis (avgCost * quantity) */
  totalCost: number;

  /** Realized P/L from closed trades */
  realizedPnL: number;

  /** Total fees paid */
  totalFees: number;

  /** First purchase date */
  firstBuyDate: Date;

  /** Last trade date */
  lastTradeDate: Date;

  /** Is position fully closed? */
  isClosed: boolean;

  /** Optional: Group assignment */
  groupId?: string;
  groupName?: string;
  groupColor?: string;
}

export interface PositionWithPrice extends Position {
  /** Current market price */
  currentPrice: number;

  /** Current market value */
  currentValue: number;

  /** Unrealized P/L */
  unrealizedPnL: number;

  /** Unrealized P/L percentage */
  unrealizedPnLPercent: number;

  /** Total P/L (realized + unrealized) */
  totalPnL: number;

  /** Total P/L percentage */
  totalPnLPercent: number;
}

export interface PortfolioTotals {
  /** Total invested (cost basis of open positions) */
  totalInvested: number;

  /** Current portfolio value */
  currentValue: number;

  /** Total unrealized P/L */
  unrealizedPnL: number;

  /** Total realized P/L */
  realizedPnL: number;

  /** Combined P/L */
  totalPnL: number;

  /** Total fees paid */
  totalFees: number;

  /** Return percentage */
  returnPercent: number;

  /** Profit-only sum (ignores losses) */
  profitOnlySum: number;

  /** Number of winning positions */
  winningPositions: number;

  /** Number of losing positions */
  losingPositions: number;
}

export interface ComputeTotalsOptions {
  /** Only count positive P/L (losses = 0) */
  profitOnly?: boolean;

  /** Only include open positions */
  openOnly?: boolean;

  /** Only include closed positions */
  closedOnly?: boolean;

  /** Filter by date range */
  dateFrom?: Date;
  dateTo?: Date;

  /** Filter by group IDs */
  groupIds?: string[];
}

// ============================================================================
// Core Calculation Functions
// ============================================================================

/**
 * Build positions from trade history using Average Cost Method
 * 
 * Algorithm:
 * 1. Group trades by instrumentId
 * 2. Sort chronologically
 * 3. For BUY: Update avgCost = (prevCost * prevQty + buyPrice * buyQty) / (prevQty + buyQty)
 * 4. For SELL: Calculate realized P/L = (sellPrice - avgCost) * sellQty - fees
 * 5. Track all fees and dates
 * 
 * @param trades Array of trades (mixed BUY/SELL)
 * @param instrumentMeta Map of instrument metadata (symbol, isin, name)
 * @returns Map of instrumentId -> Position
 */
export function buildPositionsFromTrades(
  trades: Trade[],
  instrumentMeta: Map<string, { symbol: string; isin: string; name: string; groupId?: string; groupName?: string; groupColor?: string }>
): Map<string, Position> {
  const positions = new Map<string, Position>();

  // Group trades by instrument
  const tradesByInstrument = new Map<string, Trade[]>();
  for (const trade of trades) {
    if (!tradesByInstrument.has(trade.instrumentId)) {
      tradesByInstrument.set(trade.instrumentId, []);
    }
    tradesByInstrument.get(trade.instrumentId)!.push(trade);
  }

  // Process each instrument's trades chronologically
  for (const [instrumentId, instrumentTrades] of tradesByInstrument) {
    const meta = instrumentMeta.get(instrumentId);
    if (!meta) continue; // Skip if no metadata

    // Sort trades by execution time
    const sortedTrades = [...instrumentTrades].sort(
      (a, b) => a.executedAt.getTime() - b.executedAt.getTime()
    );

    let quantity = new Decimal(0);
    let totalCostBasis = new Decimal(0); // Sum of (price * qty) for buys
    let realizedPnL = new Decimal(0);
    let totalFees = new Decimal(0);
    let firstBuyDate: Date | null = null;
    let lastTradeDate: Date = sortedTrades[0].executedAt;

    for (const trade of sortedTrades) {
      const tradeQty = new Decimal(trade.quantity);
      const tradePrice = new Decimal(trade.price);
      const tradeFees = new Decimal(trade.fees);

      totalFees = totalFees.plus(tradeFees);
      lastTradeDate = trade.executedAt;

      if (trade.type === 'BUY') {
        if (firstBuyDate === null) {
          firstBuyDate = trade.executedAt;
        }

        // Add to position (including fees in cost basis)
        totalCostBasis = totalCostBasis.plus(tradePrice.times(tradeQty)).plus(tradeFees);
        quantity = quantity.plus(tradeQty);

      } else if (trade.type === 'SELL') {
        // Calculate avgCost at time of sale
        const avgCost = quantity.isZero()
          ? new Decimal(0)
          : totalCostBasis.dividedBy(quantity);

        // Realized P/L = (sellPrice - avgCost) * qty - fees
        const pnl = tradePrice.minus(avgCost).times(tradeQty).minus(tradeFees);
        realizedPnL = realizedPnL.plus(pnl);

        // Reduce position
        const soldCostBasis = avgCost.times(tradeQty);
        totalCostBasis = totalCostBasis.minus(soldCostBasis);
        quantity = quantity.minus(tradeQty);

        // Ensure no negative quantities due to rounding
        if (quantity.lessThan(0)) quantity = new Decimal(0);
        if (totalCostBasis.lessThan(0)) totalCostBasis = new Decimal(0);
      }
    }

    // Calculate final avgCost
    const avgCost = quantity.isZero()
      ? new Decimal(0)
      : totalCostBasis.dividedBy(quantity);

    const position: Position = {
      instrumentId,
      symbol: meta.symbol,
      isin: meta.isin,
      name: meta.name,
      quantity: quantity.toNumber(),
      avgCost: avgCost.toNumber(),
      totalCost: totalCostBasis.toNumber(),
      realizedPnL: realizedPnL.toNumber(),
      totalFees: totalFees.toNumber(),
      firstBuyDate: firstBuyDate || lastTradeDate,
      lastTradeDate,
      isClosed: quantity.isZero(),
      groupId: meta.groupId,
      groupName: meta.groupName,
      groupColor: meta.groupColor,
    };

    positions.set(instrumentId, position);
  }

  return positions;
}

/**
 * Compute P/L for a position given current market price
 * 
 * @param position Position without price data
 * @param currentPrice Current market price
 * @returns Position with P/L calculations
 */
export function computePnL(
  position: Position,
  currentPrice: number
): PositionWithPrice {
  const qty = new Decimal(position.quantity);
  const avgCost = new Decimal(position.avgCost);
  const price = new Decimal(currentPrice);
  const realizedPnL = new Decimal(position.realizedPnL);

  // Current value
  const currentValue = price.times(qty);

  // Unrealized P/L = (currentPrice - avgCost) * quantity
  const unrealizedPnL = price.minus(avgCost).times(qty);

  // Unrealized P/L % = (currentPrice - avgCost) / avgCost * 100
  const unrealizedPnLPercent = avgCost.isZero()
    ? new Decimal(0)
    : price.minus(avgCost).dividedBy(avgCost).times(100);

  // Total P/L = realized + unrealized
  const totalPnL = realizedPnL.plus(unrealizedPnL);

  // Total P/L % = totalPnL / totalCost * 100
  const totalCost = new Decimal(position.totalCost).plus(position.realizedPnL); // Original investment
  const totalPnLPercent = totalCost.isZero()
    ? new Decimal(0)
    : totalPnL.dividedBy(totalCost).times(100);

  return {
    ...position,
    currentPrice: price.toNumber(),
    currentValue: currentValue.toNumber(),
    unrealizedPnL: unrealizedPnL.toNumber(),
    unrealizedPnLPercent: unrealizedPnLPercent.toNumber(),
    totalPnL: totalPnL.toNumber(),
    totalPnLPercent: totalPnLPercent.toNumber(),
  };
}

/**
 * Compute portfolio totals from positions
 * 
 * @param positions Array of positions with prices
 * @param options Filter and calculation options
 * @returns Aggregated portfolio metrics
 */
export function computeTotals(
  positions: PositionWithPrice[],
  options: ComputeTotalsOptions = {}
): PortfolioTotals {
  // Apply filters
  let filtered = positions;

  if (options.openOnly) {
    filtered = filtered.filter(p => !p.isClosed);
  }

  if (options.closedOnly) {
    filtered = filtered.filter(p => p.isClosed);
  }

  if (options.dateFrom || options.dateTo) {
    filtered = filtered.filter(p => {
      const tradeDate = p.lastTradeDate;
      if (options.dateFrom && tradeDate < options.dateFrom) return false;
      if (options.dateTo && tradeDate > options.dateTo) return false;
      return true;
    });
  }

  if (options.groupIds && options.groupIds.length > 0) {
    filtered = filtered.filter(p =>
      p.groupId && options.groupIds!.includes(p.groupId)
    );
  }

  // Aggregate totals
  let totalInvested = new Decimal(0);
  let currentValue = new Decimal(0);
  let unrealizedPnL = new Decimal(0);
  let realizedPnL = new Decimal(0);
  let totalFees = new Decimal(0);
  let profitOnlySum = new Decimal(0);
  let winningPositions = 0;
  let losingPositions = 0;

  for (const pos of filtered) {
    totalInvested = totalInvested.plus(pos.totalCost);
    currentValue = currentValue.plus(pos.currentValue);
    unrealizedPnL = unrealizedPnL.plus(pos.unrealizedPnL);
    realizedPnL = realizedPnL.plus(pos.realizedPnL);
    totalFees = totalFees.plus(pos.totalFees);

    // Profit-only logic
    const positionPnL = new Decimal(pos.totalPnL);
    if (options.profitOnly) {
      if (positionPnL.greaterThan(0)) {
        profitOnlySum = profitOnlySum.plus(positionPnL);
      }
      // Losses are ignored (= 0)
    } else {
      profitOnlySum = profitOnlySum.plus(positionPnL.greaterThan(0) ? positionPnL : 0);
    }

    // Win/Loss tracking
    if (positionPnL.greaterThan(0)) {
      winningPositions++;
    } else if (positionPnL.lessThan(0)) {
      losingPositions++;
    }
  }

  const totalPnL = realizedPnL.plus(unrealizedPnL);

  // Return % = totalPnL / (totalInvested + realizedPnL) * 100
  const investmentBase = totalInvested.plus(realizedPnL);
  const returnPercent = investmentBase.isZero()
    ? new Decimal(0)
    : totalPnL.dividedBy(investmentBase).times(100);

  return {
    totalInvested: totalInvested.toNumber(),
    currentValue: currentValue.toNumber(),
    unrealizedPnL: unrealizedPnL.toNumber(),
    realizedPnL: realizedPnL.toNumber(),
    totalPnL: totalPnL.toNumber(),
    totalFees: totalFees.toNumber(),
    returnPercent: returnPercent.toNumber(),
    profitOnlySum: profitOnlySum.toNumber(),
    winningPositions,
    losingPositions,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format number as currency (EUR)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format number as percentage
 */
export function formatPercent(value: number, decimals = 2): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

/**
 * Format number with sign (+ for positive)
 */
export function formatWithSign(value: number): string {
  const formatted = formatCurrency(value);
  return value > 0 ? `+${formatted}` : formatted;
}

/**
 * Get color class based on value
 */
export function getPnLColor(value: number): string {
  if (value > 0) return 'text-green-600 dark:text-green-400';
  if (value < 0) return 'text-red-600 dark:text-red-400';
  return 'text-gray-600 dark:text-gray-400';
}

/**
 * Get background color class for value
 */
export function getPnLBgColor(value: number): string {
  if (value > 0) return 'bg-green-50 dark:bg-green-900/20';
  if (value < 0) return 'bg-red-50 dark:bg-red-900/20';
  return 'bg-gray-50 dark:bg-gray-900/20';
}
