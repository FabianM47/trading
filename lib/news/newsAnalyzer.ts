import { supabase } from '@/lib/supabase';
import { aiChat } from './aiClient';
import type { NewsAnalyzeResult } from '@/types/news';
import { logError, logInfo } from '@/lib/logger';
import { sendNewsBriefNotifications } from './newsPushNotifier';
import { classifyArticlesWithFinBERT, calculateRelevanceScore } from './finbertClassifier';
import { getLatestMacroContext } from './macroDataProvider';
import { getTechnicalsContext } from './technicalCalculator';
import { getPredictionFeedbackContext } from './predictionStats';

const BATCH_SIZE = 8; // Artikel pro AI-Call

// ==========================================
// System Prompts
// ==========================================

const ANALYSIS_SYSTEM_PROMPT = `Du bist ein erfahrener Finanzanalyst. Analysiere die folgenden Marktnachrichten.

Antworte auf DEUTSCH, verwende aber englische Fachbegriffe fuer technische Indikatoren (RSI, MACD, Bollinger Bands, SMA, EMA, etc.) und Marktbegriffe (Bullish, Bearish, Support, Resistance, Breakout, etc.).

Fuer JEDE Nachricht erstelle:
1. Eine praegnante deutsche Zusammenfassung (2-3 Saetze)
2. Sentiment-Bewertung: "bullish", "bearish", oder "neutral"
3. Betroffene Aktien/Sektoren mit individuellem Sentiment und Relevanz (0.0-1.0)
4. Relevante technische Indikatoren die zur Situation passen (nur nennen wenn sinnvoll)
5. Kurze Prognose/Ausblick (1-2 Saetze)
6. Confidence-Score (0.0-1.0) fuer deine Einschaetzung

WICHTIG: Deine Analyse ist KEINE Anlageberatung. Kennzeichne Aussagen als Einschaetzungen.

Antworte ausschliesslich im folgenden JSON-Format:
{
  "analyses": [
    {
      "articleIndex": 0,
      "summary": "Deutsche Zusammenfassung...",
      "sentiment": "bullish",
      "affectedTickers": [
        { "ticker": "AAPL", "name": "Apple Inc.", "sentiment": "bullish", "relevance": 0.9 }
      ],
      "indicators": [
        { "name": "RSI", "interpretation": "Einschaetzung zum Indikator..." }
      ],
      "prognosis": "Deutsche Prognose...",
      "confidence": 0.75
    }
  ]
}`;

const BRIEF_SYSTEM_PROMPT = `Du bist ein Finanzredakteur und erstellst eine Tageszusammenfassung der wichtigsten Marktereignisse.

Erstelle eine strukturierte Zusammenfassung auf DEUTSCH (mit englischen Fachbegriffen fuer technische Terme).
Verwende Markdown-Formatierung.

Struktur:
## Marktuebersicht
Kurzer Ueberblick ueber die Gesamtlage (3-4 Saetze)

## Wichtigste Ereignisse
- Ereignis 1 mit Einschaetzung
- Ereignis 2 mit Einschaetzung
- Ereignis 3 mit Einschaetzung

## Sektoren im Fokus
Welche Sektoren/Branchen sind besonders betroffen

## Ausblick
Was koennte die naechsten Tage passieren (vorsichtig formuliert)

HINWEIS: Dies ist eine journalistische Zusammenfassung, keine Anlageberatung.

Antworte zusaetzlich mit einem JSON-Block am Ende, eingefasst in <json></json> Tags:
<json>
{
  "title": "Tageszusammenfassung DD. Monat YYYY",
  "overallSentiment": "bullish|bearish|neutral|mixed",
  "keyEvents": [
    { "headline": "Kurze Headline", "sentiment": "bullish", "tickers": ["AAPL", "MSFT"] }
  ]
}
</json>`;

// ==========================================
// Analyse-Logik
// ==========================================

interface DbArticle {
  id: string;
  title: string;
  summary: string | null;
  url: string | null;
  published_at: string | null;
  raw_content: string | null;
  related_tickers: string[] | null;
  category: string | null;
  source_weight?: number;
  finbert_sentiment?: string | null;
  finbert_confidence?: number | null;
}

interface AnalysisResult {
  articleIndex: number;
  summary: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  affectedTickers: Array<{
    ticker: string;
    name: string;
    sentiment: 'bullish' | 'bearish' | 'neutral';
    relevance: number;
  }>;
  indicators?: Array<{
    name: string;
    interpretation: string;
  }>;
  prognosis?: string;
  confidence?: number;
}

export interface AnalyzeOptions {
  /** Ob der Market Brief generiert werden soll (default: true) */
  generateBrief?: boolean;
}

/**
 * Analysiert alle unanalysierten Artikel mit AI (Groq → Mistral Fallback)
 * und generiert den Market Brief.
 */
export async function analyzeUnprocessedNews(options: AnalyzeOptions = {}): Promise<NewsAnalyzeResult> {
  const errors: string[] = [];
  let totalAnalyzed = 0;
  let briefGenerated = false;

  // 1. Unanalysierte Artikel der letzten 48h laden
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: articles, error: articlesError } = await supabase
    .from('news_articles')
    .select('*')
    .eq('is_analyzed', false)
    .gte('created_at', cutoff)
    .order('published_at', { ascending: false })
    .limit(50);

  if (articlesError) {
    logError('Failed to load unanalyzed articles', articlesError);
    return { analyzed: 0, briefGenerated: false, errors: [articlesError.message] };
  }

  if (!articles || articles.length === 0) {
    logInfo('No unanalyzed articles found');
    return { analyzed: 0, briefGenerated: false, errors: [] };
  }

  logInfo(`${articles.length} unanalysierte Artikel gefunden`);

  // 1b. FinBERT-Vorsortierung (Stufe 1)
  const unclassified = (articles as DbArticle[]).filter((a) => !a.finbert_sentiment);
  if (unclassified.length > 0) {
    try {
      await classifyArticlesWithFinBERT(unclassified);
      logInfo(`FinBERT classified ${unclassified.length} articles`);
    } catch (finbertError) {
      logError('FinBERT classification failed, continuing with all articles', finbertError);
    }
  }

  // 1c. Relevanz-Filterung: Nur relevante Artikel an Groq senden
  // Artikel mit hoher Relevanz ODER Ticker aus offenen Trades
  const { data: openTrades } = await supabase
    .from('trades')
    .select('ticker')
    .eq('is_closed', false)
    .not('ticker', 'is', null);
  const portfolioTickers = new Set((openTrades || []).map((t) => t.ticker).filter(Boolean));

  const relevantArticles = (articles as DbArticle[]).filter((article) => {
    // Immer relevant wenn keine FinBERT-Daten (Fallback)
    if (!article.finbert_confidence) return true;

    const relevance = calculateRelevanceScore(
      article.source_weight ?? 1.0,
      article.finbert_confidence
    );
    if (relevance > 0.4) return true;

    // Relevant wenn Ticker aus dem Portfolio betroffen
    if (article.related_tickers?.some((t) => portfolioTickers.has(t))) return true;

    return false;
  });

  logInfo(`${relevantArticles.length}/${articles.length} Artikel nach Relevanz-Filterung`);

  // Nicht-relevante Artikel als analysiert markieren (nur FinBERT, kein LLM)
  const skippedArticles = (articles as DbArticle[]).filter((a) => !relevantArticles.includes(a));
  if (skippedArticles.length > 0) {
    const skippedIds = skippedArticles.map((a) => a.id);
    await supabase
      .from('news_articles')
      .update({ is_analyzed: true })
      .in('id', skippedIds);
    logInfo(`${skippedIds.length} low-relevance articles marked as analyzed (FinBERT only)`);
  }

  // 2. In Batches aufteilen und analysieren
  const batches: DbArticle[][] = [];
  for (let i = 0; i < relevantArticles.length; i += BATCH_SIZE) {
    batches.push(relevantArticles.slice(i, i + BATCH_SIZE));
  }

  const allAnalysisIds: string[] = [];

  for (const batch of batches) {
    try {
      const analysisId = await analyzeBatch(batch);
      if (analysisId) {
        allAnalysisIds.push(analysisId);
        totalAnalyzed += batch.length;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logError('Batch analysis failed', error);
      errors.push(msg);
    }
  }

  // 3. Market Brief generieren (falls Analysen erfolgreich und gewuenscht)
  const shouldGenerateBrief = options.generateBrief !== false;
  if (allAnalysisIds.length > 0 && shouldGenerateBrief) {
    try {
      const briefMeta = await generateMarketBrief(articles as DbArticle[], allAnalysisIds);
      briefGenerated = true;

      // 4. Push-Notifications an berechtigte User senden (fire-and-forget)
      try {
        await sendNewsBriefNotifications({
          title: briefMeta.title,
          overallSentiment: briefMeta.overallSentiment,
          firstHeadline: briefMeta.keyEvents?.[0]?.headline,
        });
      } catch (pushError) {
        logError('Failed to send news brief push notifications', pushError);
        // Push-Fehler ist nicht kritisch, wird nicht zu errors[] hinzugefuegt
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logError('Market brief generation failed', error);
      errors.push(`Brief: ${msg}`);
    }
  }

  logInfo(`Analyse complete: ${totalAnalyzed} analysiert, Brief: ${briefGenerated}`);
  return { analyzed: totalAnalyzed, briefGenerated, errors };
}

/**
 * Analysiert einen Batch von Artikeln mit AI (Groq/Mistral).
 */
async function analyzeBatch(articles: DbArticle[]): Promise<string | null> {
  const startTime = Date.now();

  // Artikel-Text fuer den Prompt vorbereiten
  const articleTexts = articles.map((article, index) => {
    const parts = [`[Artikel ${index}] ${article.title}`];
    if (article.summary) parts.push(article.summary);
    if (article.related_tickers?.length) parts.push(`Ticker: ${article.related_tickers.join(', ')}`);
    if (article.category) parts.push(`Kategorie: ${article.category}`);
    return parts.join('\n');
  });

  const userMessage = `Analysiere diese ${articles.length} Marktnachrichten:\n\n${articleTexts.join('\n\n---\n\n')}`;

  try {
    // Kontext-Anreicherung: Makro, Technicals, Ticker History, Feedback
    let enrichedPrompt = ANALYSIS_SYSTEM_PROMPT;

    // Alle betroffenen Ticker sammeln
    const allTickers = articles.flatMap((a) => a.related_tickers || []);
    const uniqueTickers = [...new Set(allTickers)];

    // Makro-Kontext hinzufuegen
    try {
      const macroCtx = await getLatestMacroContext();
      if (macroCtx) enrichedPrompt += macroCtx;
    } catch { /* non-critical */ }

    // Technische Indikatoren hinzufuegen
    if (uniqueTickers.length > 0) {
      try {
        const techCtx = await getTechnicalsContext(uniqueTickers);
        if (techCtx) enrichedPrompt += techCtx;
      } catch { /* non-critical */ }
    }

    // Ticker History Context (letzte 5 Analysen pro Ticker)
    if (uniqueTickers.length > 0) {
      try {
        const historyCtx = await getTickerHistoryContext(uniqueTickers);
        if (historyCtx) enrichedPrompt += historyCtx;
      } catch { /* non-critical */ }
    }

    // Prediction Feedback hinzufuegen
    try {
      const feedbackCtx = await getPredictionFeedbackContext(uniqueTickers);
      if (feedbackCtx) enrichedPrompt += feedbackCtx;
    } catch { /* non-critical */ }

    const result = await aiChat({
      systemPrompt: enrichedPrompt,
      userMessage,
      jsonMode: true,
      maxTokens: 4096,
    });

    // JSON parsen
    const parsed = JSON.parse(result.text) as { analyses: AnalysisResult[] };
    if (!parsed.analyses || !Array.isArray(parsed.analyses)) {
      throw new Error('Invalid analysis response format');
    }

    const duration = Date.now() - startTime;

    // Pro Analyse-Ergebnis einen DB-Eintrag erstellen
    for (const analysis of parsed.analyses) {
      const articleId = articles[analysis.articleIndex]?.id;
      if (!articleId) continue;

      const { error: insertError } = await supabase.from('news_analyses').insert({
        article_ids: [articleId],
        summary_de: analysis.summary,
        sentiment: analysis.sentiment,
        affected_tickers: analysis.affectedTickers || [],
        indicators: analysis.indicators || null,
        prognosis_de: analysis.prognosis || null,
        confidence: analysis.confidence || null,
        model_used: `${result.provider}/${result.model}`,
        prompt_tokens: result.promptTokens || null,
        completion_tokens: result.completionTokens || null,
        analysis_duration_ms: duration,
      });

      if (insertError) {
        logError(`Failed to insert analysis for article ${articleId}`, insertError);
      }

      // Predictions erstellen fuer Ticker mit hoher Relevanz
      try {
        await createPredictions(analysis, `${result.provider}/${result.model}`);
      } catch { /* non-critical */ }
    }

    // Artikel als analysiert markieren
    const articleIds = articles.map((a) => a.id);
    await supabase
      .from('news_articles')
      .update({ is_analyzed: true })
      .in('id', articleIds);

    // Rueckgabe der letzten Analysis-ID (fuer den Brief)
    const { data: lastAnalysis } = await supabase
      .from('news_analyses')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return lastAnalysis?.id || null;
  } catch (error) {
    logError('AI analysis call failed', error);
    throw error;
  }
}

interface BriefMetadata {
  title: string;
  overallSentiment: string;
  keyEvents: Array<{ headline: string; sentiment: string; tickers: string[] }>;
}

/**
 * Generiert den taeglichen Market Brief basierend auf allen heutigen Analysen.
 * Gibt die Brief-Metadaten zurueck (fuer Push-Notifications).
 */
async function generateMarketBrief(
  articles: DbArticle[],
  analysisIds: string[]
): Promise<BriefMetadata> {
  const today = new Date().toISOString().split('T')[0];

  // Artikel-Titel als Kontext
  const headlines = articles
    .slice(0, 20) // Max 20 Headlines fuer den Brief
    .map((a, i) => `${i + 1}. ${a.title}${a.summary ? ` - ${a.summary.substring(0, 100)}` : ''}`)
    .join('\n');

  const userMessage = `Erstelle eine Tageszusammenfassung fuer den ${new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })} basierend auf diesen ${articles.length} Nachrichten:\n\n${headlines}`;

  // Makro-Kontext fuer den Brief
  let briefPrompt = BRIEF_SYSTEM_PROMPT;
  try {
    const macroCtx = await getLatestMacroContext();
    if (macroCtx) briefPrompt += macroCtx;
  } catch { /* non-critical */ }

  const result = await aiChat({
    systemPrompt: briefPrompt,
    userMessage,
    maxTokens: 2048,
  });

  const fullText = result.text;

  // JSON-Block aus dem Text extrahieren
  let metadata = {
    title: `Tageszusammenfassung ${new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    overallSentiment: 'mixed' as string,
    keyEvents: [] as Array<{ headline: string; sentiment: string; tickers: string[] }>,
  };

  const jsonMatch = fullText.match(/<json>([\s\S]*?)<\/json>/);
  if (jsonMatch) {
    try {
      metadata = JSON.parse(jsonMatch[1]);
    } catch {
      logError('Failed to parse brief metadata JSON', new Error('Invalid JSON in brief'));
    }
  }

  // Markdown-Content (ohne den JSON-Block)
  const markdownContent = fullText.replace(/<json>[\s\S]*?<\/json>/, '').trim();

  // Brief in DB speichern (upsert fuer den heutigen Tag)
  const { error: upsertError } = await supabase
    .from('market_briefs')
    .upsert(
      {
        brief_date: today,
        title_de: metadata.title,
        content_de: markdownContent,
        key_events: metadata.keyEvents || [],
        overall_sentiment: metadata.overallSentiment || 'mixed',
        article_count: articles.length,
        analysis_ids: analysisIds,
        model_used: `${result.provider}/${result.model}`,
        prompt_tokens: result.promptTokens || null,
        completion_tokens: result.completionTokens || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'brief_date' }
    );

  if (upsertError) {
    logError('Failed to upsert market brief', upsertError);
    throw upsertError;
  }

  logInfo(`Market Brief fuer ${today} generiert via ${result.provider}/${result.model}`);

  return metadata;
}

// ==========================================
// Kontext-Hilfsfunktionen
// ==========================================

/**
 * Laedt die letzten 5 Analysen pro Ticker als Kontext fuer den Prompt.
 */
async function getTickerHistoryContext(tickers: string[]): Promise<string> {
  if (tickers.length === 0) return '';

  // Letzte Analysen laden die diese Ticker betreffen
  const { data: analyses, error } = await supabase
    .from('news_analyses')
    .select('summary_de, sentiment, confidence, affected_tickers, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !analyses || analyses.length === 0) return '';

  const tickerHistory = new Map<string, Array<{ date: string; sentiment: string; confidence: number; summary: string }>>();

  for (const analysis of analyses) {
    const affectedTickers = (analysis.affected_tickers || []) as Array<{ ticker: string; sentiment: string; relevance: number }>;
    for (const at of affectedTickers) {
      if (!tickers.includes(at.ticker)) continue;
      const history = tickerHistory.get(at.ticker) || [];
      if (history.length >= 5) continue; // Max 5 pro Ticker
      history.push({
        date: new Date(analysis.created_at).toLocaleDateString('de-DE'),
        sentiment: at.sentiment || analysis.sentiment,
        confidence: analysis.confidence || 0,
        summary: analysis.summary_de?.substring(0, 80) || '',
      });
      tickerHistory.set(at.ticker, history);
    }
  }

  if (tickerHistory.size === 0) return '';

  const lines = Array.from(tickerHistory.entries()).map(([ticker, history]) => {
    const entries = history.map(
      (h, i) => `  ${i + 1}. ${h.date}: ${h.sentiment} (Conf: ${h.confidence}) - "${h.summary}..."`
    );
    return `${ticker} - Letzte ${history.length} Analysen:\n${entries.join('\n')}`;
  });

  return `\n\nHistorischer Kontext fuer betroffene Ticker:\n${lines.join('\n\n')}\nAchte auf Konsistenz mit deinen frueheren Einschaetzungen. Wenn du deine Meinung aenderst, begruende warum.`;
}

/**
 * Erstellt Predictions fuer Ticker mit hoher Relevanz aus einer Analyse.
 */
async function createPredictions(
  analysis: AnalysisResult,
  modelUsed: string
): Promise<void> {
  if (!analysis.affectedTickers || analysis.affectedTickers.length === 0) return;

  const relevantTickers = analysis.affectedTickers.filter((t) => t.relevance >= 0.5);
  if (relevantTickers.length === 0) return;

  for (const ticker of relevantTickers) {
    // Aktuellen Kurs versuchen zu holen
    const { data: techData } = await supabase
      .from('ticker_technicals')
      .select('close_price')
      .eq('ticker', ticker.ticker)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    const priceAtPrediction = techData?.close_price
      ? parseFloat(techData.close_price)
      : null;

    // 24h Prediction
    const { error: err24 } = await supabase.from('predictions').insert({
      ticker: ticker.ticker,
      direction: ticker.sentiment || analysis.sentiment,
      confidence: analysis.confidence || 0.5,
      price_at_prediction: priceAtPrediction,
      timeframe_hours: 24,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      model_used: modelUsed,
    });

    if (err24) logError(`Failed to create 24h prediction for ${ticker.ticker}`, err24);

    // 7-Tage Prediction
    const { error: err7d } = await supabase.from('predictions').insert({
      ticker: ticker.ticker,
      direction: ticker.sentiment || analysis.sentiment,
      confidence: analysis.confidence || 0.5,
      price_at_prediction: priceAtPrediction,
      timeframe_hours: 168,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      model_used: modelUsed,
    });

    if (err7d) logError(`Failed to create 7d prediction for ${ticker.ticker}`, err7d);
  }
}
