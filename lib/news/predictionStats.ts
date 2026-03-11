/**
 * Prediction Stats
 *
 * Aggregiert Prognose-Statistiken fuer den Feedback-Loop im Analyse-Prompt.
 */

import { supabase } from '@/lib/supabase';

interface PredictionStats {
  total: number;
  correct: number;
  accuracy: number;
  bullishAccuracy: number | null;
  bearishAccuracy: number | null;
  avgBrierScore: number | null;
}

interface TickerStats {
  ticker: string;
  total: number;
  correct: number;
  accuracy: number;
}

/**
 * Holt die Gesamtstatistiken der letzten 30 Tage.
 */
async function getOverallStats(): Promise<PredictionStats | null> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('predictions')
    .select('direction, confidence, was_correct, brier_score')
    .not('was_correct', 'is', null)
    .gte('created_at', cutoff);

  if (error || !data || data.length < 5) return null; // Mindestens 5 Predictions

  const total = data.length;
  const correct = data.filter((p) => p.was_correct).length;
  const accuracy = correct / total;

  const bullish = data.filter((p) => p.direction === 'bullish');
  const bearish = data.filter((p) => p.direction === 'bearish');

  const bullishAccuracy =
    bullish.length >= 3
      ? bullish.filter((p) => p.was_correct).length / bullish.length
      : null;

  const bearishAccuracy =
    bearish.length >= 3
      ? bearish.filter((p) => p.was_correct).length / bearish.length
      : null;

  const brierScores = data
    .map((p) => p.brier_score)
    .filter((s): s is number => s !== null);
  const avgBrierScore =
    brierScores.length > 0
      ? brierScores.reduce((sum, s) => sum + s, 0) / brierScores.length
      : null;

  return { total, correct, accuracy, bullishAccuracy, bearishAccuracy, avgBrierScore };
}

/**
 * Holt Statistiken fuer spezifische Ticker.
 */
async function getTickerStats(tickers: string[]): Promise<TickerStats[]> {
  if (tickers.length === 0) return [];

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('predictions')
    .select('ticker, was_correct')
    .in('ticker', tickers)
    .not('was_correct', 'is', null)
    .gte('created_at', cutoff);

  if (error || !data) return [];

  const byTicker = new Map<string, { total: number; correct: number }>();
  for (const p of data) {
    const stats = byTicker.get(p.ticker) || { total: 0, correct: 0 };
    stats.total++;
    if (p.was_correct) stats.correct++;
    byTicker.set(p.ticker, stats);
  }

  return Array.from(byTicker.entries())
    .filter(([, stats]) => stats.total >= 2)
    .map(([ticker, stats]) => ({
      ticker,
      total: stats.total,
      correct: stats.correct,
      accuracy: stats.correct / stats.total,
    }));
}

/**
 * Generiert den Feedback-Block fuer den Analyse-Prompt.
 */
export async function getPredictionFeedbackContext(
  relevantTickers: string[] = []
): Promise<string> {
  const overall = await getOverallStats();
  if (!overall) return ''; // Noch nicht genug Daten

  const lines: string[] = [
    '',
    'Deine bisherige Prognose-Qualitaet (letzte 30 Tage):',
    `- Gesamttrefferquote: ${Math.round(overall.accuracy * 100)}% (${overall.correct} von ${overall.total} korrekt)`,
  ];

  if (overall.bullishAccuracy !== null) {
    lines.push(
      `- Bullish-Prognosen: ${Math.round(overall.bullishAccuracy * 100)}% korrekt`
    );
  }
  if (overall.bearishAccuracy !== null) {
    lines.push(
      `- Bearish-Prognosen: ${Math.round(overall.bearishAccuracy * 100)}% korrekt`
    );
  }
  if (overall.avgBrierScore !== null) {
    lines.push(
      `- Durchschnittlicher Brier Score: ${overall.avgBrierScore.toFixed(2)} (0 = perfekt, 1 = schlecht)`
    );
  }

  // Ticker-spezifische Stats
  const tickerStats = await getTickerStats(relevantTickers);
  for (const ts of tickerStats) {
    lines.push(
      `- Fuer ${ts.ticker}: ${ts.correct}/${ts.total} korrekt (${Math.round(ts.accuracy * 100)}%)`
    );
  }

  lines.push('Passe deine Konfidenz entsprechend an.');

  // Spezifische Hinweise bei Schwaechen
  if (overall.bearishAccuracy !== null && overall.bullishAccuracy !== null) {
    if (overall.bearishAccuracy < overall.bullishAccuracy - 0.15) {
      lines.push(
        'HINWEIS: Deine bearishen Prognosen sind deutlich weniger treffsicher. Sei bei negativen Einschaetzungen vorsichtiger.'
      );
    }
    if (overall.bullishAccuracy < overall.bearishAccuracy - 0.15) {
      lines.push(
        'HINWEIS: Deine bullishen Prognosen sind deutlich weniger treffsicher. Sei bei positiven Einschaetzungen vorsichtiger.'
      );
    }
  }

  return lines.join('\n');
}
