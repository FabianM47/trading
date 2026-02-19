import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * API Route für Wechselkurse
 * Läuft server-side und umgeht CSP-Probleme
 */
export async function GET() {
  const apis = [
    {
      name: 'ECB (European Central Bank)',
      url: 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml',
      parse: async (response: Response) => {
        const text = await response.text();
        const match = text.match(/currency='USD'[^>]*rate='([0-9.]+)'/);
        return match ? parseFloat(match[1]) : null;
      },
    },
    {
      name: 'Fawaz Ahmed Currency API',
      url: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json',
      parse: async (response: Response) => {
        const data = await response.json();
        return data.eur?.usd;
      },
    },
    {
      name: 'Exchangerate.host',
      url: 'https://api.exchangerate.host/latest?base=EUR&symbols=USD',
      parse: async (response: Response) => {
        const data = await response.json();
        return data.rates?.USD;
      },
    },
    {
      name: 'Frankfurter',
      url: 'https://api.frankfurter.app/latest?from=EUR&to=USD',
      parse: async (response: Response) => {
        const data = await response.json();
        return data.rates?.USD;
      },
    },
  ];

  let lastError: Error | null = null;

  // Versuche APIs nacheinander
  for (const api of apis) {
    try {
      console.log(`[Exchange Rate API] Trying ${api.name}...`);
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(api.url, {
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const usdRate = await api.parse(response);

      if (!usdRate || typeof usdRate !== 'number' || usdRate <= 0) {
        throw new Error('Invalid rate data');
      }

      console.log(`[Exchange Rate API] ✓ Success from ${api.name}: 1 EUR = ${usdRate} USD`);

      return NextResponse.json({
        success: true,
        data: {
          EUR: 1.0,
          USD: usdRate,
          timestamp: Date.now(),
          source: api.name,
        },
      });
    } catch (error) {
      lastError = error as Error;
      console.warn(`[Exchange Rate API] Failed ${api.name}:`, error);
      continue;
    }
  }

  // Alle APIs fehlgeschlagen
  console.error('[Exchange Rate API] All sources failed');
  
  return NextResponse.json(
    {
      success: false,
      error: `Failed to fetch exchange rates: ${lastError?.message || 'Unknown error'}`,
    },
    { status: 503 }
  );
}
