/**
 * Prediction Verifier
 *
 * Prueft abgelaufene Prognosen gegen aktuelle Kurse.
 * Berechnet Brier Score und aktualisiert die Predictions-Tabelle.
 */

import { supabase } from '@/lib/supabase';
import { logError, logInfo } from '@/lib/logger';

interface PendingPrediction {
  id: string;
  ticker: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  price_at_prediction: number | null;
}

/**
 * Verifiziert alle abgelaufenen Predictions.
 */
export async function verifyExpiredPredictions(): Promise<{
  verified: number;
  errors: string[];
}> {
  const errors: string[] = [];

  // Abgelaufene, unverifizierte Predictions laden
  const { data: predictions, error: loadError } = await supabase
    .from('predictions')
    .select('id, ticker, direction, confidence, price_at_prediction')
    .is('was_correct', null)
    .lt('expires_at', new Date().toISOString())
    .limit(100);

  if (loadError) {
    return { verified: 0, errors: [loadError.message] };
  }

  if (!predictions || predictions.length === 0) {
    logInfo('No expired predictions to verify');
    return { verified: 0, errors: [] };
  }

  logInfo(`Verifying ${predictions.length} expired predictions...`);

  // Unique Ticker sammeln
  const tickers = [...new Set(predictions.map((p) => p.ticker))];

  // Aktuelle Kurse holen (via Quotes API intern)
  const currentPrices = new Map<string, number>();
  for (const ticker of tickers) {
    try {
      const { data: quote } = await supabase
        .from('ticker_technicals')
        .select('close_price')
        .eq('ticker', ticker)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (quote?.close_price) {
        currentPrices.set(ticker, parseFloat(quote.close_price));
      }
    } catch {
      // Fallback: Preis nicht verfuegbar
    }
  }

  let verified = 0;

  for (const prediction of predictions as PendingPrediction[]) {
    const currentPrice = currentPrices.get(prediction.ticker);
    if (!currentPrice || !prediction.price_at_prediction) {
      errors.push(`${prediction.ticker}: no current price available`);
      continue;
    }

    const priceChange = currentPrice - prediction.price_at_prediction;
    let wasCorrect: boolean;

    switch (prediction.direction) {
      case 'bullish':
        wasCorrect = priceChange > 0;
        break;
      case 'bearish':
        wasCorrect = priceChange < 0;
        break;
      case 'neutral':
        // Neutral = korrekt wenn Kursaenderung < 1%
        wasCorrect =
          Math.abs(priceChange / prediction.price_at_prediction) < 0.01;
        break;
    }

    // Brier Score: (confidence - outcome)^2
    const outcome = wasCorrect ? 1 : 0;
    const brierScore = (prediction.confidence - outcome) ** 2;

    const { error: updateError } = await supabase
      .from('predictions')
      .update({
        actual_price: currentPrice,
        was_correct: wasCorrect,
        brier_score: Math.round(brierScore * 10000) / 10000,
      })
      .eq('id', prediction.id);

    if (updateError) {
      errors.push(`${prediction.id}: ${updateError.message}`);
    } else {
      verified++;
    }
  }

  logInfo(`Predictions verified: ${verified}/${predictions.length}`);
  return { verified, errors };
}
