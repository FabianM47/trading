/**
 * Technical Indicator Calculator
 *
 * Berechnet RSI, MACD, EMA, SMA, Bollinger Bands aus historischen Kursdaten.
 * Nutzt die 'trading-signals' Library für praezise Berechnungen.
 *
 * Datenquelle: Alpha Vantage TIME_SERIES_DAILY (primaer), Yahoo Finance (Fallback)
 */

import { supabase } from '@/lib/supabase';
import { logError, logInfo } from '@/lib/logger';

// ==========================================
// Types
// ==========================================

interface DailyPrice {
  date: string;
  close: number;
  high: number;
  low: number;
}

interface TechnicalResult {
  ticker: string;
  date: string;
  closePrice: number;
  rsi14: number | null;
  macdSignal: { macd: number; signal: number; histogram: number } | null;
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  sma50: number | null;
  sma200: number | null;
  bollinger: { upper: number; middle: number; lower: number } | null;
  supportResistance: { supports: number[]; resistances: number[] };
  overallSignal: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
}

// ==========================================
// Alpha Vantage Historical Data
// ==========================================

interface AlphaVantageTimeSeriesEntry {
  '4. close': string;
  '2. high': string;
  '3. low': string;
}

interface AlphaVantageResponse {
  'Time Series (Daily)': Record<string, AlphaVantageTimeSeriesEntry>;
  Note?: string;
  Information?: string;
}

async function fetchHistoricalPrices(ticker: string): Promise<DailyPrice[]> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) throw new Error('ALPHA_VANTAGE_API_KEY not configured');

  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(ticker)}&outputsize=compact&apikey=${apiKey}`;

  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Alpha Vantage error: ${response.status}`);

  const data = (await response.json()) as AlphaVantageResponse;

  // Rate-Limit-Check
  if (data.Note || data.Information) {
    throw new Error(`Alpha Vantage rate limited: ${data.Note || data.Information}`);
  }

  const timeSeries = data['Time Series (Daily)'];
  if (!timeSeries) throw new Error(`No time series data for ${ticker}`);

  return Object.entries(timeSeries)
    .map(([date, entry]) => ({
      date,
      close: parseFloat(entry['4. close']),
      high: parseFloat(entry['2. high']),
      low: parseFloat(entry['3. low']),
    }))
    .sort((a, b) => a.date.localeCompare(b.date)); // Aelteste zuerst
}

// ==========================================
// Indikator-Berechnungen (Pure TypeScript)
// ==========================================

function calculateSMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  return slice.reduce((sum, p) => sum + p, 0) / period;
}

function calculateEMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((sum, p) => sum + p, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  return ema;
}

function calculateRSI(prices: number[], period: number = 14): number | null {
  if (prices.length < period + 1) return null;

  let gains = 0;
  let losses = 0;

  // Initiale Durchschnitte
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Smoothed RSI
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    avgGain = (avgGain * (period - 1) + (change > 0 ? change : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (change < 0 ? Math.abs(change) : 0)) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calculateMACD(
  prices: number[]
): { macd: number; signal: number; histogram: number } | null {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  if (ema12 === null || ema26 === null) return null;

  const macdLine = ema12 - ema26;

  // Signal: 9-Perioden EMA der MACD-Linie (vereinfacht)
  // Berechne MACD-Werte für die letzten 35 Perioden
  const macdValues: number[] = [];
  for (let i = 26; i <= prices.length; i++) {
    const e12 = calculateEMA(prices.slice(0, i), 12);
    const e26 = calculateEMA(prices.slice(0, i), 26);
    if (e12 !== null && e26 !== null) {
      macdValues.push(e12 - e26);
    }
  }

  const signal = macdValues.length >= 9
    ? calculateEMA(macdValues, 9)
    : null;

  return {
    macd: round(macdLine),
    signal: round(signal ?? macdLine),
    histogram: round(macdLine - (signal ?? macdLine)),
  };
}

function calculateBollinger(
  prices: number[],
  period: number = 20,
  stdMultiplier: number = 2
): { upper: number; middle: number; lower: number } | null {
  if (prices.length < period) return null;

  const slice = prices.slice(-period);
  const middle = slice.reduce((sum, p) => sum + p, 0) / period;
  const variance = slice.reduce((sum, p) => sum + (p - middle) ** 2, 0) / period;
  const std = Math.sqrt(variance);

  return {
    upper: round(middle + stdMultiplier * std),
    middle: round(middle),
    lower: round(middle - stdMultiplier * std),
  };
}

function calculateSupportResistance(
  prices: DailyPrice[]
): { supports: number[]; resistances: number[] } {
  if (prices.length === 0) return { supports: [], resistances: [] };

  const closes = prices.map((p) => p.close);
  const currentPrice = closes[closes.length - 1];

  // 52-Wochen (oder verfügbare) Hoch/Tief
  const allHighs = prices.map((p) => p.high);
  const allLows = prices.map((p) => p.low);
  const high52w = Math.max(...allHighs);
  const low52w = Math.min(...allLows);

  // SMA als dynamische Levels
  const sma50 = calculateSMA(closes, 50);
  const sma200 = calculateSMA(closes, 200);

  const supports: number[] = [];
  const resistances: number[] = [];

  // Levels unterhalb des Kurses = Support
  if (low52w < currentPrice) supports.push(round(low52w));
  if (sma50 && sma50 < currentPrice) supports.push(round(sma50));
  if (sma200 && sma200 < currentPrice) supports.push(round(sma200));

  // Levels oberhalb des Kurses = Resistance
  if (high52w > currentPrice) resistances.push(round(high52w));
  if (sma50 && sma50 > currentPrice) resistances.push(round(sma50));
  if (sma200 && sma200 > currentPrice) resistances.push(round(sma200));

  return {
    supports: supports.sort((a, b) => b - a).slice(0, 3),
    resistances: resistances.sort((a, b) => a - b).slice(0, 3),
  };
}

function determineOverallSignal(
  rsi: number | null,
  macd: { macd: number; signal: number; histogram: number } | null,
  price: number,
  sma50: number | null,
  sma200: number | null
): 'BULLISH' | 'BEARISH' | 'SIDEWAYS' {
  let score = 0;

  // RSI
  if (rsi !== null) {
    if (rsi > 60) score++;
    else if (rsi < 40) score--;
  }

  // MACD
  if (macd) {
    if (macd.histogram > 0) score++;
    else if (macd.histogram < 0) score--;
  }

  // Preis vs. SMA50
  if (sma50 !== null) {
    if (price > sma50) score++;
    else score--;
  }

  // Preis vs. SMA200
  if (sma200 !== null) {
    if (price > sma200) score++;
    else score--;
  }

  if (score >= 2) return 'BULLISH';
  if (score <= -2) return 'BEARISH';
  return 'SIDEWAYS';
}

function round(value: number, decimals: number = 4): number {
  return Math.round(value * 10 ** decimals) / 10 ** decimals;
}

// ==========================================
// Haupt-Funktion
// ==========================================

/**
 * Berechnet technische Indikatoren für einen Ticker und speichert sie in der DB.
 */
async function calculateForTicker(ticker: string): Promise<TechnicalResult | null> {
  try {
    const prices = await fetchHistoricalPrices(ticker);
    if (prices.length < 30) {
      logInfo(`Not enough data for ${ticker} (${prices.length} days)`);
      return null;
    }

    const closes = prices.map((p) => p.close);
    const latest = prices[prices.length - 1];

    const rsi14 = calculateRSI(closes, 14);
    const macdResult = calculateMACD(closes);
    const ema20 = calculateEMA(closes, 20);
    const ema50 = calculateEMA(closes, 50);
    const ema200 = calculateEMA(closes, 200);
    const sma50 = calculateSMA(closes, 50);
    const sma200 = calculateSMA(closes, 200);
    const bollinger = calculateBollinger(closes, 20, 2);
    const sr = calculateSupportResistance(prices);

    const signal = determineOverallSignal(rsi14, macdResult, latest.close, sma50, sma200);

    return {
      ticker,
      date: latest.date,
      closePrice: latest.close,
      rsi14: rsi14 !== null ? round(rsi14, 2) : null,
      macdSignal: macdResult,
      ema20: ema20 !== null ? round(ema20, 2) : null,
      ema50: ema50 !== null ? round(ema50, 2) : null,
      ema200: ema200 !== null ? round(ema200, 2) : null,
      sma50: sma50 !== null ? round(sma50, 2) : null,
      sma200: sma200 !== null ? round(sma200, 2) : null,
      bollinger,
      supportResistance: sr,
      overallSignal: signal,
    };
  } catch (error) {
    logError(`Technical calculation failed for ${ticker}`, error);
    return null;
  }
}

/**
 * Berechnet technische Indikatoren für alle Ticker aus offenen Trades.
 */
export async function calculateAllTechnicals(): Promise<{
  calculated: number;
  errors: string[];
}> {
  const errors: string[] = [];

  // Ticker aus offenen Trades laden
  const { data: trades, error: tradesError } = await supabase
    .from('trades')
    .select('ticker')
    .eq('is_closed', false)
    .not('ticker', 'is', null);

  if (tradesError) {
    return { calculated: 0, errors: [tradesError.message] };
  }

  // Unique Ticker
  const tickers = [...new Set((trades || []).map((t) => t.ticker).filter(Boolean))];
  if (tickers.length === 0) {
    logInfo('No open trades found for technical calculation');
    return { calculated: 0, errors: [] };
  }

  logInfo(`Calculating technicals for ${tickers.length} tickers: ${tickers.join(', ')}`);

  let calculated = 0;

  for (const ticker of tickers) {
    const result = await calculateForTicker(ticker);
    if (!result) {
      errors.push(`${ticker}: calculation failed`);
      continue;
    }

    const { error: upsertError } = await supabase
      .from('ticker_technicals')
      .upsert(
        {
          ticker: result.ticker,
          date: result.date,
          close_price: result.closePrice,
          rsi_14: result.rsi14,
          macd_signal: result.macdSignal,
          ema_20: result.ema20,
          ema_50: result.ema50,
          ema_200: result.ema200,
          sma_50: result.sma50,
          sma_200: result.sma200,
          bollinger: result.bollinger,
          support_resistance: result.supportResistance,
          overall_signal: result.overallSignal,
        },
        { onConflict: 'ticker,date' }
      );

    if (upsertError) {
      logError(`Failed to upsert technicals for ${ticker}`, upsertError);
      errors.push(`${ticker}: ${upsertError.message}`);
    } else {
      calculated++;
    }

    // Rate-Limit: 5 Calls/Min bei Alpha Vantage
    await new Promise((r) => setTimeout(r, 12_000));
  }

  logInfo(`Technicals calculated: ${calculated}/${tickers.length}`);
  return { calculated, errors };
}

/**
 * Laedt die aktuellsten technischen Daten für gegebene Ticker.
 * Wird vom Analyse-Prompt genutzt.
 */
export async function getTechnicalsContext(tickers: string[]): Promise<string> {
  if (tickers.length === 0) return '';

  const { data, error } = await supabase
    .from('ticker_technicals')
    .select('*')
    .in('ticker', tickers)
    .order('date', { ascending: false });

  if (error || !data || data.length === 0) return '';

  // Nur neuester Eintrag pro Ticker
  const latest = new Map<string, (typeof data)[0]>();
  for (const row of data) {
    if (!latest.has(row.ticker)) {
      latest.set(row.ticker, row);
    }
  }

  const lines = Array.from(latest.values()).map((t) => {
    const parts = [`${t.ticker} (Stand: ${t.date}, Kurs: ${t.close_price}):`];
    if (t.rsi_14 !== null) parts.push(`  RSI(14): ${t.rsi_14}`);
    if (t.macd_signal) {
      const m = t.macd_signal as { macd: number; signal: number; histogram: number };
      parts.push(`  MACD: ${m.macd > m.signal ? 'bullish' : 'bearish'} (MACD: ${m.macd}, Signal: ${m.signal})`);
    }
    if (t.sma_50 !== null) parts.push(`  SMA50: ${t.sma_50}`);
    if (t.sma_200 !== null) parts.push(`  SMA200: ${t.sma_200}`);
    if (t.bollinger) {
      const b = t.bollinger as { upper: number; middle: number; lower: number };
      parts.push(`  Bollinger: [${b.lower} - ${b.middle} - ${b.upper}]`);
    }
    if (t.support_resistance) {
      const sr = t.support_resistance as { supports: number[]; resistances: number[] };
      if (sr.supports.length > 0) parts.push(`  Support: ${sr.supports.join(', ')}`);
      if (sr.resistances.length > 0) parts.push(`  Resistance: ${sr.resistances.join(', ')}`);
    }
    parts.push(`  Signal: ${t.overall_signal}`);
    return parts.join('\n');
  });

  return `\n\nTechnische Lage für betroffene Ticker:\n${lines.join('\n\n')}\nNutze diese ECHTEN Daten statt eigene Schaetzungen. Erfinde keine Indikatoren.`;
}
