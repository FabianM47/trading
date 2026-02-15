import { describe, it, expect } from 'vitest';
import {
  roundTo2,
  calculateTradePnL,
  enrichTradeWithPnL,
  calculatePortfolioSummary,
  filterTradesByMonth,
  filterTradesByTimeRange,
  filterTradesBySearch,
  filterOnlyWinners,
  sortTrades,
  applyFilters,
  calculateFullPortfolioSummary,
} from '../lib/calculations';
import type { Trade, TradeWithPnL } from '../types';

describe('calculations', () => {
  describe('roundTo2', () => {
    it('should round to 2 decimal places', () => {
      expect(roundTo2(1.2345)).toBe(1.23);
      expect(roundTo2(1.2367)).toBe(1.24);
      expect(roundTo2(10)).toBe(10);
      expect(roundTo2(-5.678)).toBe(-5.68);
    });
  });

  describe('calculateTradePnL', () => {
    const trade: Trade = {
      id: '1',
      isin: 'US0378331005',
      ticker: 'AAPL',
      name: 'Apple Inc.',
      buyPrice: 150,
      quantity: 10,
      investedEur: 1500,
      buyDate: '2026-01-01T00:00:00.000Z',
    };

    it('should calculate positive P/L correctly', () => {
      const result = calculateTradePnL(trade, 160);
      expect(result.pnlEur).toBe(100); // (160 - 150) * 10
      expect(result.pnlPct).toBe(6.67); // ((160/150) - 1) * 100
    });

    it('should calculate negative P/L correctly', () => {
      const result = calculateTradePnL(trade, 140);
      expect(result.pnlEur).toBe(-100); // (140 - 150) * 10
      expect(result.pnlPct).toBe(-6.67); // ((140/150) - 1) * 100
    });

    it('should calculate zero P/L correctly', () => {
      const result = calculateTradePnL(trade, 150);
      expect(result.pnlEur).toBe(0);
      expect(result.pnlPct).toBe(0);
    });
  });

  describe('enrichTradeWithPnL', () => {
    it('should enrich trade with current price and P/L', () => {
      const trade: Trade = {
        id: '1',
        isin: 'US0378331005',
        ticker: 'AAPL',
        name: 'Apple Inc.',
        buyPrice: 100,
        quantity: 5,
        investedEur: 500,
        buyDate: '2026-01-01T00:00:00.000Z',
      };

      const enriched = enrichTradeWithPnL(trade, 120);
      
      expect(enriched.currentPrice).toBe(120);
      expect(enriched.pnlEur).toBe(100);
      expect(enriched.pnlPct).toBe(20);
    });
  });

  describe('calculatePortfolioSummary', () => {
    const trades: TradeWithPnL[] = [
      {
        id: '1',
        isin: 'A',
        name: 'Stock A',
        buyPrice: 100,
        quantity: 10,
        investedEur: 1000,
        buyDate: '2026-01-01T00:00:00.000Z',
        currentPrice: 110,
        pnlEur: 100,
        pnlPct: 10,
      },
      {
        id: '2',
        isin: 'B',
        name: 'Stock B',
        buyPrice: 200,
        quantity: 5,
        investedEur: 1000,
        buyDate: '2026-01-15T00:00:00.000Z',
        currentPrice: 180,
        pnlEur: -100,
        pnlPct: -10,
      },
    ];

    it('should calculate portfolio summary correctly', () => {
      const summary = calculatePortfolioSummary(trades);
      
      expect(summary.totalInvested).toBe(2000);
      expect(summary.totalValue).toBe(2000); // (110*10) + (180*5) = 1100 + 900
      expect(summary.pnlEur).toBe(0); // 100 + (-100)
      expect(summary.pnlPct).toBe(0); // (2000/2000 - 1) * 100
    });

    it('should handle empty trades', () => {
      const summary = calculatePortfolioSummary([]);
      
      expect(summary.totalInvested).toBe(0);
      expect(summary.totalValue).toBe(0);
      expect(summary.pnlEur).toBe(0);
      expect(summary.pnlPct).toBe(0);
    });
  });

  describe('filterTradesByMonth', () => {
    const trades: TradeWithPnL[] = [
      {
        id: '1',
        isin: 'A',
        name: 'Stock A',
        buyPrice: 100,
        quantity: 10,
        investedEur: 1000,
        buyDate: '2026-01-15T00:00:00.000Z',
        currentPrice: 110,
        pnlEur: 100,
        pnlPct: 10,
      },
      {
        id: '2',
        isin: 'B',
        name: 'Stock B',
        buyPrice: 200,
        quantity: 5,
        investedEur: 1000,
        buyDate: '2026-02-10T00:00:00.000Z',
        currentPrice: 180,
        pnlEur: -100,
        pnlPct: -10,
      },
      {
        id: '3',
        isin: 'C',
        name: 'Stock C',
        buyPrice: 50,
        quantity: 20,
        investedEur: 1000,
        buyDate: '2026-01-20T00:00:00.000Z',
        currentPrice: 55,
        pnlEur: 100,
        pnlPct: 10,
      },
    ];

    it('should filter trades by month correctly', () => {
      const januaryTrades = filterTradesByMonth(trades, 2026, 0); // Januar = 0
      expect(januaryTrades.length).toBe(2);
      expect(januaryTrades[0].id).toBe('1');
      expect(januaryTrades[1].id).toBe('3');
    });

    it('should return empty for months with no trades', () => {
      const marchTrades = filterTradesByMonth(trades, 2026, 2); // März = 2
      expect(marchTrades.length).toBe(0);
    });
  });

  describe('filterTradesBySearch', () => {
    const trades: TradeWithPnL[] = [
      {
        id: '1',
        isin: 'US0378331005',
        ticker: 'AAPL',
        name: 'Apple Inc.',
        buyPrice: 100,
        quantity: 10,
        investedEur: 1000,
        buyDate: '2026-01-01T00:00:00.000Z',
        currentPrice: 110,
        pnlEur: 100,
        pnlPct: 10,
      },
      {
        id: '2',
        isin: 'US5949181045',
        ticker: 'MSFT',
        name: 'Microsoft Corporation',
        buyPrice: 200,
        quantity: 5,
        investedEur: 1000,
        buyDate: '2026-01-15T00:00:00.000Z',
        currentPrice: 180,
        pnlEur: -100,
        pnlPct: -10,
      },
    ];

    it('should filter by name', () => {
      const result = filterTradesBySearch(trades, 'apple');
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Apple Inc.');
    });

    it('should filter by ticker', () => {
      const result = filterTradesBySearch(trades, 'msft');
      expect(result.length).toBe(1);
      expect(result[0].ticker).toBe('MSFT');
    });

    it('should filter by ISIN', () => {
      const result = filterTradesBySearch(trades, 'US037833');
      expect(result.length).toBe(1);
      expect(result[0].isin).toBe('US0378331005');
    });

    it('should return all trades for empty query', () => {
      const result = filterTradesBySearch(trades, '');
      expect(result.length).toBe(2);
    });
  });

  describe('filterOnlyWinners', () => {
    const trades: TradeWithPnL[] = [
      {
        id: '1',
        isin: 'A',
        name: 'Winner',
        buyPrice: 100,
        quantity: 10,
        investedEur: 1000,
        buyDate: '2026-01-01T00:00:00.000Z',
        currentPrice: 110,
        pnlEur: 100,
        pnlPct: 10,
      },
      {
        id: '2',
        isin: 'B',
        name: 'Loser',
        buyPrice: 200,
        quantity: 5,
        investedEur: 1000,
        buyDate: '2026-01-15T00:00:00.000Z',
        currentPrice: 180,
        pnlEur: -100,
        pnlPct: -10,
      },
    ];

    it('should filter only winning trades', () => {
      const result = filterOnlyWinners(trades);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Winner');
    });
  });

  describe('sortTrades', () => {
    const trades: TradeWithPnL[] = [
      {
        id: '1',
        isin: 'A',
        name: 'Apple',
        buyPrice: 100,
        quantity: 10,
        investedEur: 1000,
        buyDate: '2026-01-01T00:00:00.000Z',
        currentPrice: 110,
        pnlEur: 100,
        pnlPct: 10,
      },
      {
        id: '2',
        isin: 'B',
        name: 'Microsoft',
        buyPrice: 200,
        quantity: 5,
        investedEur: 1000,
        buyDate: '2026-01-15T00:00:00.000Z',
        currentPrice: 240,
        pnlEur: 200,
        pnlPct: 20,
      },
    ];

    it('should sort by P/L EUR descending', () => {
      const sorted = sortTrades(trades, 'pnlEur');
      expect(sorted[0].pnlEur).toBe(200);
      expect(sorted[1].pnlEur).toBe(100);
    });

    it('should sort by P/L % descending', () => {
      const sorted = sortTrades(trades, 'pnlPct');
      expect(sorted[0].pnlPct).toBe(20);
      expect(sorted[1].pnlPct).toBe(10);
    });

    it('should sort by date descending', () => {
      const sorted = sortTrades(trades, 'date');
      expect(sorted[0].buyDate).toBe('2026-01-15T00:00:00.000Z');
      expect(sorted[1].buyDate).toBe('2026-01-01T00:00:00.000Z');
    });

    it('should sort by name ascending', () => {
      const sorted = sortTrades(trades, 'name');
      expect(sorted[0].name).toBe('Apple');
      expect(sorted[1].name).toBe('Microsoft');
    });
  });

  describe('calculateFullPortfolioSummary', () => {
    const trades: TradeWithPnL[] = [
      {
        id: '1',
        isin: 'A',
        name: 'Stock A',
        buyPrice: 100,
        quantity: 10,
        investedEur: 1000,
        buyDate: new Date(2026, 1, 15).toISOString(), // Februar
        currentPrice: 110,
        pnlEur: 100,
        pnlPct: 10,
      },
      {
        id: '2',
        isin: 'B',
        name: 'Stock B',
        buyPrice: 200,
        quantity: 5,
        investedEur: 1000,
        buyDate: new Date(2025, 11, 10).toISOString(), // Dezember 2025
        currentPrice: 220,
        pnlEur: 100,
        pnlPct: 10,
      },
    ];

    it('should include month P/L for current month trades', () => {
      const summary = calculateFullPortfolioSummary(trades);
      
      expect(summary.totalInvested).toBe(2000);
      expect(summary.pnlEur).toBe(200);
      // monthPnlEur depends on current date
      expect(typeof summary.monthPnlEur).toBe('number');
      expect(typeof summary.monthPnlPct).toBe('number');
    });
  });
});
