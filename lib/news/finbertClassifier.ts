/**
 * FinBERT Sentiment Classifier
 *
 * Nutzt die Hugging Face Inference API für finanzspezifische Sentiment-Analyse.
 * Modell: ProsusAI/finbert (97% Accuracy auf Financial PhraseBank)
 *
 * Synchroner Aufruf — wartet auf Response, auch bei Cold Start.
 */

import { supabase } from '@/lib/supabase';
import { logError, logInfo } from '@/lib/logger';

const HUGGINGFACE_API_URL =
  'https://api-inference.huggingface.co/models/ProsusAI/finbert';

interface FinBERTLabel {
  label: 'positive' | 'negative' | 'neutral';
  score: number;
}

export interface FinBERTResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
}

/**
 * Klassifiziert einen Text mit FinBERT.
 * Wartet bei Cold Start (503) automatisch und retried.
 */
export async function classifyWithFinBERT(text: string): Promise<FinBERTResult | null> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) return null;

  // Text kuerzen (FinBERT hat 512 Token Limit)
  const truncated = text.slice(0, 1500);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(HUGGINGFACE_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: truncated,
          options: { wait_for_model: true },
        }),
        signal: AbortSignal.timeout(90_000), // 90s für Cold Start
      });

      if (response.status === 503) {
        // Modell wird geladen, warten und retry
        logInfo(`FinBERT model loading, attempt ${attempt + 1}/3...`);
        await new Promise((r) => setTimeout(r, 10_000));
        continue;
      }

      if (!response.ok) {
        throw new Error(`HuggingFace API error: ${response.status}`);
      }

      const data = (await response.json()) as FinBERTLabel[][];
      if (!data?.[0] || data[0].length === 0) {
        return null;
      }

      // Hoechsten Score finden
      const labels = data[0];
      const best = labels.reduce((a, b) => (a.score > b.score ? a : b));

      return {
        sentiment: best.label,
        confidence: best.score,
      };
    } catch (error) {
      if (attempt === 2) {
        logError('FinBERT classification failed after 3 attempts', error);
        return null;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  return null;
}

/**
 * Klassifiziert mehrere Artikel sequentiell mit FinBERT.
 * Speichert die Ergebnisse direkt in der DB.
 */
export async function classifyArticlesWithFinBERT(
  articles: Array<{ id: string; title: string; summary?: string | null }>
): Promise<number> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    logInfo('HUGGINGFACE_API_KEY not configured, skipping FinBERT classification');
    return 0;
  }

  let classified = 0;

  for (const article of articles) {
    const text = article.summary
      ? `${article.title}. ${article.summary}`
      : article.title;

    const result = await classifyWithFinBERT(text);
    if (!result) continue;

    const { error } = await supabase
      .from('news_articles')
      .update({
        finbert_sentiment: result.sentiment,
        finbert_confidence: result.confidence,
      })
      .eq('id', article.id);

    if (!error) {
      classified++;
    }
  }

  logInfo(`FinBERT classified ${classified}/${articles.length} articles`);
  return classified;
}

/**
 * Berechnet den Relevanz-Score für einen Artikel.
 */
export function calculateRelevanceScore(
  sourceWeight: number,
  finbertConfidence: number
): number {
  return sourceWeight * finbertConfidence;
}
