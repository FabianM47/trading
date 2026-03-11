/**
 * FRED API Client
 *
 * Holt makrooekonomische Daten von der Federal Reserve Bank of St. Louis.
 * https://fred.stlouisfed.org/docs/api/fred/
 */

import { supabase } from '@/lib/supabase';
import { logError, logInfo } from '@/lib/logger';

const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';

interface FredIndicator {
  key: string;
  name: string;
  unit: string;
}

const INDICATORS: FredIndicator[] = [
  { key: 'FEDFUNDS', name: 'Fed Funds Rate', unit: '%' },
  { key: 'CPIAUCSL', name: 'CPI (Urban Consumers)', unit: 'Index' },
  { key: 'UNRATE', name: 'Unemployment Rate', unit: '%' },
  { key: 'VIXCLS', name: 'VIX Volatility Index', unit: 'Index' },
  { key: 'DGS10', name: '10-Year Treasury Yield', unit: '%' },
  { key: 'T10Y2Y', name: '10Y-2Y Treasury Spread', unit: '%' },
];

interface FredObservation {
  date: string;
  value: string;
}

interface FredApiResponse {
  observations: FredObservation[];
}

/**
 * Holt den neuesten Wert einer FRED-Zeitreihe.
 */
async function fetchFredSeries(seriesId: string, apiKey: string): Promise<FredObservation | null> {
  const url = new URL(FRED_BASE_URL);
  url.searchParams.set('series_id', seriesId);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('file_type', 'json');
  url.searchParams.set('sort_order', 'desc');
  url.searchParams.set('limit', '1');

  const response = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
  if (!response.ok) {
    throw new Error(`FRED API error for ${seriesId}: ${response.status}`);
  }

  const data = (await response.json()) as FredApiResponse;
  const obs = data.observations?.[0];
  if (!obs || obs.value === '.') return null; // '.' = no data
  return obs;
}

/**
 * Holt alle konfigurierten Makro-Indikatoren von FRED und speichert sie in der DB.
 */
export async function fetchMacroIndicators(): Promise<{
  updated: number;
  errors: string[];
}> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    return { updated: 0, errors: ['FRED_API_KEY not configured'] };
  }

  let updated = 0;
  const errors: string[] = [];

  for (const indicator of INDICATORS) {
    try {
      const obs = await fetchFredSeries(indicator.key, apiKey);
      if (!obs) {
        logInfo(`No data for ${indicator.key}`);
        continue;
      }

      const { error: upsertError } = await supabase
        .from('macro_indicators')
        .upsert(
          {
            indicator_key: indicator.key,
            name: indicator.name,
            value: parseFloat(obs.value),
            unit: indicator.unit,
            observation_date: obs.date,
            source: 'FRED',
            fetched_at: new Date().toISOString(),
          },
          { onConflict: 'indicator_key,observation_date' }
        );

      if (upsertError) {
        logError(`Failed to upsert ${indicator.key}`, upsertError);
        errors.push(`${indicator.key}: ${upsertError.message}`);
      } else {
        updated++;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logError(`Failed to fetch ${indicator.key}`, error);
      errors.push(`${indicator.key}: ${msg}`);
    }
  }

  logInfo(`Macro indicators updated: ${updated}/${INDICATORS.length}`);
  return { updated, errors };
}

/**
 * Laedt die aktuellsten Makro-Indikatoren aus der DB.
 * Wird vom Analyse-Prompt genutzt.
 */
export async function getLatestMacroContext(): Promise<string> {
  const { data, error } = await supabase
    .from('macro_indicators')
    .select('indicator_key, name, value, unit, observation_date')
    .order('observation_date', { ascending: false });

  if (error || !data || data.length === 0) {
    return '';
  }

  // Nur den neuesten Wert pro Indikator
  const latest = new Map<string, typeof data[0]>();
  for (const row of data) {
    if (!latest.has(row.indicator_key)) {
      latest.set(row.indicator_key, row);
    }
  }

  const lines = Array.from(latest.values()).map(
    (row) => `- ${row.name}: ${row.value}${row.unit ? ` ${row.unit}` : ''} (Stand: ${row.observation_date})`
  );

  return `\n\nAktueller Makro-Kontext:\n${lines.join('\n')}\nBeruecksichtige diese Daten bei deiner Analyse.`;
}

export { INDICATORS };
