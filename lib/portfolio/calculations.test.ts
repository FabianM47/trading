/**
 * Tests for Portfolio Calculation Functions
 * 
 * Edge cases:
 * - Partial sells
 * - Fees handling
 * - Decimal precision
 * - Empty portfolios
 * - Multiple buys/sells
 */

import { describe, expect, it } from 'vitest';
import {
  buildPositionsFromTrades,
  computePnL,
  computeTotals,
  type Trade,
} from './calculations';

// ============================================================================
// Test Data
// ============================================================================

const mockInstrumentMeta = new Map([
  ['inst-1', { symbol: 'AAPL', isin: 'US0378331005', name: 'Apple Inc.' }],
  ['inst-2', { symbol: 'MSFT', isin: 'US5949181045', name: 'Microsoft Corp.' }],
]);

// ============================================================================
// buildPositionsFromTrades Tests
// ============================================================================

describe('buildPositionsFromTrades', () => {
  it('should calculate weighted average cost correctly', () => {
    const trades: Trade[] = [
      {
        id: '1',
        instrumentId: 'inst-1',
        type: 'BUY',
        quantity: 10,
        price: 100,
        fees: 5,
        executedAt: new Date('2024-01-01'),
        portfolioId: 'port-1',
      },
      {
        id: '2',
        instrumentId: 'inst-1',
        type: 'BUY',
        quantity: 5,
        price: 120,
        fees: 3,
        executedAt: new Date('2024-01-15'),
        portfolioId: 'port-1',
      },
    ];

    const positions = buildPositionsFromTrades(trades, mockInstrumentMeta);
    const position = positions.get('inst-1')!;

    // avgCost = (10*100 + 5 + 5*120 + 3) / 15 = 1608/15 = 107.2
    expect(position.quantity).toBe(15);
    expect(position.avgCost).toBeCloseTo(107.2, 2);
    expect(position.totalCost).toBeCloseTo(1608, 2);
    expect(position.totalFees).toBe(8); // 5 + 3
    expect(position.realizedPnL).toBe(0); // No sells
    expect(position.isClosed).toBe(false);
  });

  it('should handle partial sell correctly (Average Cost)', () => {
    const trades: Trade[] = [
      {
        id: '1',
        instrumentId: 'inst-1',
        type: 'BUY',
        quantity: 10,
        price: 100,
        fees: 5,
        executedAt: new Date('2024-01-01'),
        portfolioId: 'port-1',
      },
      {
        id: '2',
        instrumentId: 'inst-1',
        type: 'SELL',
        quantity: 4,
        price: 130,
        fees: 2,
        executedAt: new Date('2024-02-01'),
        portfolioId: 'port-1',
      },
    ];

    const positions = buildPositionsFromTrades(trades, mockInstrumentMeta);
    const position = positions.get('inst-1')!;

    // After buy: avgCost = (10*100 + 5) / 10 = 100.5, quantity = 10, totalCost = 1005
    // Sell: realized P/L = (130 - 100.5) * 4 - 2 = 118 - 2 = 116
    // After sell: quantity = 6, totalCost = 100.5 * 6 = 603
    expect(position.quantity).toBe(6);
    expect(position.avgCost).toBeCloseTo(100.5, 2); // Remains same
    expect(position.totalCost).toBeCloseTo(603, 2);
    expect(position.realizedPnL).toBeCloseTo(116, 2);
    expect(position.totalFees).toBe(7); // 5 + 2
    expect(position.isClosed).toBe(false);
  });

  it('should handle complete close (sell all)', () => {
    const trades: Trade[] = [
      {
        id: '1',
        instrumentId: 'inst-1',
        type: 'BUY',
        quantity: 10,
        price: 100,
        fees: 5,
        executedAt: new Date('2024-01-01'),
        portfolioId: 'port-1',
      },
      {
        id: '2',
        instrumentId: 'inst-1',
        type: 'SELL',
        quantity: 10,
        price: 120,
        fees: 5,
        executedAt: new Date('2024-02-01'),
        portfolioId: 'port-1',
      },
    ];

    const positions = buildPositionsFromTrades(trades, mockInstrumentMeta);
    const position = positions.get('inst-1')!;

    // Buy: avgCost = (10*100 + 5) / 10 = 100.5, totalCost = 1005
    // Realized P/L = (120 - 100.5) * 10 - 5 = 195 - 5 = 190
    expect(position.quantity).toBe(0);
    expect(position.totalCost).toBe(0);
    expect(position.realizedPnL).toBeCloseTo(190, 2);
    expect(position.totalFees).toBe(10);
    expect(position.isClosed).toBe(true);
  });

  it('should handle multiple buys and sells', () => {
    const trades: Trade[] = [
      {
        id: '1',
        instrumentId: 'inst-1',
        type: 'BUY',
        quantity: 10,
        price: 100,
        fees: 5,
        executedAt: new Date('2024-01-01'),
        portfolioId: 'port-1',
      },
      {
        id: '2',
        instrumentId: 'inst-1',
        type: 'BUY',
        quantity: 5,
        price: 110,
        fees: 3,
        executedAt: new Date('2024-01-15'),
        portfolioId: 'port-1',
      },
      {
        id: '3',
        instrumentId: 'inst-1',
        type: 'SELL',
        quantity: 7,
        price: 125,
        fees: 4,
        executedAt: new Date('2024-02-01'),
        portfolioId: 'port-1',
      },
      {
        id: '4',
        instrumentId: 'inst-1',
        type: 'BUY',
        quantity: 3,
        price: 115,
        fees: 2,
        executedAt: new Date('2024-02-15'),
        portfolioId: 'port-1',
      },
    ];

    const positions = buildPositionsFromTrades(trades, mockInstrumentMeta);
    const position = positions.get('inst-1')!;

    // After Buy 1: qty=10, totalCost=1000+5=1005, avgCost=100.5
    // After Buy 2: qty=15, totalCost=1005+550+3=1558, avgCost=103.867
    // After Sell: qty=8, realized=(125-103.867)*7-4=143.93, totalCost=103.867*8=830.93
    // After Buy 3: qty=11, totalCost=830.93+345+2=1177.93, avgCost=107.084
    expect(position.quantity).toBe(11);
    expect(position.avgCost).toBeCloseTo(107.08, 1);
    expect(position.realizedPnL).toBeCloseTo(143.93, 1);
    expect(position.totalFees).toBe(14);
    expect(position.isClosed).toBe(false);
  });

  it('should handle fees correctly in all calculations', () => {
    const trades: Trade[] = [
      {
        id: '1',
        instrumentId: 'inst-1',
        type: 'BUY',
        quantity: 10,
        price: 100,
        fees: 10,
        executedAt: new Date('2024-01-01'),
        portfolioId: 'port-1',
      },
      {
        id: '2',
        instrumentId: 'inst-1',
        type: 'SELL',
        quantity: 10,
        price: 105,
        fees: 10,
        executedAt: new Date('2024-02-01'),
        portfolioId: 'port-1',
      },
    ];

    const positions = buildPositionsFromTrades(trades, mockInstrumentMeta);
    const position = positions.get('inst-1')!;

    // Buy: avgCost = (10*100 + 10) / 10 = 101, totalCost = 1010
    // Sell: realized = (105-101)*10 - 10 = 40 - 10 = 30
    // Total fees = 20
    expect(position.realizedPnL).toBeCloseTo(30, 2);
    expect(position.totalFees).toBe(20);
  });
  it('should handle empty trades', () => {
    const positions = buildPositionsFromTrades([], mockInstrumentMeta);
    expect(positions.size).toBe(0);
  });

  it('should handle multiple instruments', () => {
    const trades: Trade[] = [
      {
        id: '1',
        instrumentId: 'inst-1',
        type: 'BUY',
        quantity: 10,
        price: 100,
        fees: 5,
        executedAt: new Date('2024-01-01'),
        portfolioId: 'port-1',
      },
      {
        id: '2',
        instrumentId: 'inst-2',
        type: 'BUY',
        quantity: 5,
        price: 200,
        fees: 10,
        executedAt: new Date('2024-01-01'),
        portfolioId: 'port-1',
      },
    ];

    const positions = buildPositionsFromTrades(trades, mockInstrumentMeta);

    expect(positions.size).toBe(2);
    expect(positions.get('inst-1')!.quantity).toBe(10);
    expect(positions.get('inst-2')!.quantity).toBe(5);
  });

  it('should handle decimal precision (no rounding errors)', () => {
    const trades: Trade[] = [
      {
        id: '1',
        instrumentId: 'inst-1',
        type: 'BUY',
        quantity: 3,
        price: 100.33,
        fees: 1.5,
        executedAt: new Date('2024-01-01'),
        portfolioId: 'port-1',
      },
      {
        id: '2',
        instrumentId: 'inst-1',
        type: 'BUY',
        quantity: 7,
        price: 99.67,
        fees: 2.3,
        executedAt: new Date('2024-01-15'),
        portfolioId: 'port-1',
      },
    ];

    const positions = buildPositionsFromTrades(trades, mockInstrumentMeta);
    const position = positions.get('inst-1')!;

    // avgCost = (3*100.33 + 1.5 + 7*99.67 + 2.3) / 10 = (300.99 + 1.5 + 697.69 + 2.3) / 10 = 1002.48 / 10 = 100.248
    expect(position.avgCost).toBeCloseTo(100.248, 2);
    expect(position.quantity).toBe(10);
  });
});

// ============================================================================
// computePnL Tests
// ============================================================================

describe('computePnL', () => {
  it('should calculate unrealized P/L correctly', () => {
    const position = {
      instrumentId: 'inst-1',
      symbol: 'AAPL',
      isin: 'US0378331005',
      name: 'Apple Inc.',
      quantity: 10,
      avgCost: 100,
      totalCost: 1000,
      realizedPnL: 0,
      totalFees: 5,
      firstBuyDate: new Date('2024-01-01'),
      lastTradeDate: new Date('2024-01-01'),
      isClosed: false,
    };

    const withPrice = computePnL(position, 130);

    // Unrealized P/L = (130 - 100) * 10 = 300
    expect(withPrice.unrealizedPnL).toBeCloseTo(300, 2);
    expect(withPrice.unrealizedPnLPercent).toBeCloseTo(30, 2); // 30%
    expect(withPrice.currentValue).toBeCloseTo(1300, 2);
    expect(withPrice.totalPnL).toBeCloseTo(300, 2); // No realized
  });

  it('should combine realized and unrealized P/L', () => {
    const position = {
      instrumentId: 'inst-1',
      symbol: 'AAPL',
      isin: 'US0378331005',
      name: 'Apple Inc.',
      quantity: 5,
      avgCost: 100,
      totalCost: 500,
      realizedPnL: 150, // From previous sell
      totalFees: 10,
      firstBuyDate: new Date('2024-01-01'),
      lastTradeDate: new Date('2024-02-01'),
      isClosed: false,
    };

    const withPrice = computePnL(position, 120);

    // Unrealized = (120 - 100) * 5 = 100
    // Total = 150 (realized) + 100 (unrealized) = 250
    expect(withPrice.unrealizedPnL).toBeCloseTo(100, 2);
    expect(withPrice.totalPnL).toBeCloseTo(250, 2);
  });

  it('should handle negative P/L', () => {
    const position = {
      instrumentId: 'inst-1',
      symbol: 'AAPL',
      isin: 'US0378331005',
      name: 'Apple Inc.',
      quantity: 10,
      avgCost: 100,
      totalCost: 1000,
      realizedPnL: 0,
      totalFees: 5,
      firstBuyDate: new Date('2024-01-01'),
      lastTradeDate: new Date('2024-01-01'),
      isClosed: false,
    };

    const withPrice = computePnL(position, 80);

    // Unrealized P/L = (80 - 100) * 10 = -200
    expect(withPrice.unrealizedPnL).toBeCloseTo(-200, 2);
    expect(withPrice.unrealizedPnLPercent).toBeCloseTo(-20, 2);
    expect(withPrice.totalPnL).toBeCloseTo(-200, 2);
  });

  it('should handle closed position (quantity = 0)', () => {
    const position = {
      instrumentId: 'inst-1',
      symbol: 'AAPL',
      isin: 'US0378331005',
      name: 'Apple Inc.',
      quantity: 0,
      avgCost: 100,
      totalCost: 0,
      realizedPnL: 200,
      totalFees: 10,
      firstBuyDate: new Date('2024-01-01'),
      lastTradeDate: new Date('2024-02-01'),
      isClosed: true,
    };

    const withPrice = computePnL(position, 130);

    // No unrealized (closed)
    expect(withPrice.unrealizedPnL).toBe(0);
    expect(withPrice.currentValue).toBe(0);
    expect(withPrice.totalPnL).toBeCloseTo(200, 2); // Only realized
  });
});

// ============================================================================
// computeTotals Tests
// ============================================================================

describe('computeTotals', () => {
  it('should aggregate portfolio totals correctly', () => {
    const positions = [
      {
        instrumentId: 'inst-1',
        symbol: 'AAPL',
        isin: 'US0378331005',
        name: 'Apple Inc.',
        quantity: 10,
        avgCost: 100,
        totalCost: 1000,
        realizedPnL: 50,
        totalFees: 10,
        firstBuyDate: new Date('2024-01-01'),
        lastTradeDate: new Date('2024-01-01'),
        isClosed: false,
        currentPrice: 120,
        currentValue: 1200,
        unrealizedPnL: 200,
        unrealizedPnLPercent: 20,
        totalPnL: 250,
        totalPnLPercent: 23.81,
      },
      {
        instrumentId: 'inst-2',
        symbol: 'MSFT',
        isin: 'US5949181045',
        name: 'Microsoft Corp.',
        quantity: 5,
        avgCost: 200,
        totalCost: 1000,
        realizedPnL: 0,
        totalFees: 5,
        firstBuyDate: new Date('2024-01-01'),
        lastTradeDate: new Date('2024-01-01'),
        isClosed: false,
        currentPrice: 180,
        currentValue: 900,
        unrealizedPnL: -100,
        unrealizedPnLPercent: -10,
        totalPnL: -100,
        totalPnLPercent: -10,
      },
    ];

    const totals = computeTotals(positions);

    expect(totals.totalInvested).toBe(2000);
    expect(totals.currentValue).toBe(2100);
    expect(totals.unrealizedPnL).toBe(100); // 200 - 100
    expect(totals.realizedPnL).toBe(50);
    expect(totals.totalPnL).toBe(150); // 50 + 100
    expect(totals.totalFees).toBe(15);
    expect(totals.winningPositions).toBe(1);
    expect(totals.losingPositions).toBe(1);
  });

  it('should calculate profit-only sum correctly', () => {
    const positions = [
      {
        instrumentId: 'inst-1',
        symbol: 'AAPL',
        isin: 'US0378331005',
        name: 'Apple Inc.',
        quantity: 10,
        avgCost: 100,
        totalCost: 1000,
        realizedPnL: 0,
        totalFees: 5,
        firstBuyDate: new Date('2024-01-01'),
        lastTradeDate: new Date('2024-01-01'),
        isClosed: false,
        currentPrice: 120,
        currentValue: 1200,
        unrealizedPnL: 200,
        unrealizedPnLPercent: 20,
        totalPnL: 200,
        totalPnLPercent: 20,
      },
      {
        instrumentId: 'inst-2',
        symbol: 'MSFT',
        isin: 'US5949181045',
        name: 'Microsoft Corp.',
        quantity: 5,
        avgCost: 200,
        totalCost: 1000,
        realizedPnL: 0,
        totalFees: 5,
        firstBuyDate: new Date('2024-01-01'),
        lastTradeDate: new Date('2024-01-01'),
        isClosed: false,
        currentPrice: 180,
        currentValue: 900,
        unrealizedPnL: -100,
        unrealizedPnLPercent: -10,
        totalPnL: -100,
        totalPnLPercent: -10,
      },
    ];

    const totals = computeTotals(positions, { profitOnly: false });

    // Profit-only sum = 200 + max(0, -100) = 200
    expect(totals.profitOnlySum).toBe(200);
  });

  it('should filter by open positions', () => {
    const positions = [
      {
        instrumentId: 'inst-1',
        symbol: 'AAPL',
        isin: 'US0378331005',
        name: 'Apple Inc.',
        quantity: 10,
        avgCost: 100,
        totalCost: 1000,
        realizedPnL: 0,
        totalFees: 5,
        firstBuyDate: new Date('2024-01-01'),
        lastTradeDate: new Date('2024-01-01'),
        isClosed: false,
        currentPrice: 120,
        currentValue: 1200,
        unrealizedPnL: 200,
        unrealizedPnLPercent: 20,
        totalPnL: 200,
        totalPnLPercent: 20,
      },
      {
        instrumentId: 'inst-2',
        symbol: 'MSFT',
        isin: 'US5949181045',
        name: 'Microsoft Corp.',
        quantity: 0,
        avgCost: 200,
        totalCost: 0,
        realizedPnL: 100,
        totalFees: 5,
        firstBuyDate: new Date('2024-01-01'),
        lastTradeDate: new Date('2024-02-01'),
        isClosed: true,
        currentPrice: 180,
        currentValue: 0,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        totalPnL: 100,
        totalPnLPercent: 10,
      },
    ];

    const totals = computeTotals(positions, { openOnly: true });

    expect(totals.totalInvested).toBe(1000);
    expect(totals.currentValue).toBe(1200);
    expect(totals.unrealizedPnL).toBe(200);
    expect(totals.realizedPnL).toBe(0); // Closed position excluded
  });

  it('should filter by date range', () => {
    const positions = [
      {
        instrumentId: 'inst-1',
        symbol: 'AAPL',
        isin: 'US0378331005',
        name: 'Apple Inc.',
        quantity: 10,
        avgCost: 100,
        totalCost: 1000,
        realizedPnL: 0,
        totalFees: 5,
        firstBuyDate: new Date('2024-01-01'),
        lastTradeDate: new Date('2024-01-15'),
        isClosed: false,
        currentPrice: 120,
        currentValue: 1200,
        unrealizedPnL: 200,
        unrealizedPnLPercent: 20,
        totalPnL: 200,
        totalPnLPercent: 20,
      },
      {
        instrumentId: 'inst-2',
        symbol: 'MSFT',
        isin: 'US5949181045',
        name: 'Microsoft Corp.',
        quantity: 5,
        avgCost: 200,
        totalCost: 1000,
        realizedPnL: 0,
        totalFees: 5,
        firstBuyDate: new Date('2024-02-01'),
        lastTradeDate: new Date('2024-02-15'),
        isClosed: false,
        currentPrice: 180,
        currentValue: 900,
        unrealizedPnL: -100,
        unrealizedPnLPercent: -10,
        totalPnL: -100,
        totalPnLPercent: -10,
      },
    ];

    const totals = computeTotals(positions, {
      dateFrom: new Date('2024-02-01'),
      dateTo: new Date('2024-02-28'),
    });

    // Only MSFT included
    expect(totals.totalInvested).toBe(1000);
    expect(totals.unrealizedPnL).toBe(-100);
  });
});
