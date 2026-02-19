/**
 * Currency Converter Service
 * 
 * Holt aktuelle Wechselkurse und cached sie für 1 Stunde
 * Unterstützt: USD <-> EUR
 */

interface ExchangeRates {
  USD: number;
  EUR: number;
  timestamp: number;
}

let cachedRates: ExchangeRates | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 Stunde

// Initialisiere mit Fallback-Werten
let currentRate = 1.08; // USD per EUR (default)

/**
 * Holt aktuelle Wechselkurse von der Server-Side API
 * Umgeht CSP-Probleme durch Server-Side Fetching
 */
async function fetchExchangeRates(): Promise<ExchangeRates> {
  // Prüfe Cache
  if (cachedRates && Date.now() - cachedRates.timestamp < CACHE_DURATION) {
    return cachedRates;
  }

  try {
    console.log('Fetching exchange rates from server API...');
    
    const response = await fetch('/api/exchange-rate', {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Invalid API response');
    }

    const rates: ExchangeRates = {
      EUR: result.data.EUR,
      USD: result.data.USD,
      timestamp: result.data.timestamp,
    };

    cachedRates = rates;
    currentRate = rates.USD;
    console.log(`✓ Exchange rates loaded: 1 EUR = ${rates.USD} USD (from ${result.data.source})`);
    
    return rates;
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error);
    
    // Fallback auf gecachte Rates (auch wenn älter als 1h)
    if (cachedRates) {
      const age = Math.round((Date.now() - cachedRates.timestamp) / 1000 / 60);
      console.warn(`Using outdated cached rates (${age} minutes old)`);
      return cachedRates;
    }
    
    // Keine gecachten Daten verfügbar - werfe Fehler
    throw new Error(`Failed to fetch exchange rates: ${(error as Error).message}`);
  }
}

/**
 * Konvertiert USD zu EUR (SYNCHRON mit gecachtem Rate)
 */
export function convertUSDtoEURSync(amountUSD: number): number {
  return amountUSD / currentRate;
}

/**
 * Konvertiert EUR zu USD (SYNCHRON mit gecachtem Rate)
 */
export function convertEURtoUSDSync(amountEUR: number): number {
  return amountEUR * currentRate;
}

/**
 * Konvertiert beliebigen Betrag zu EUR (SYNCHRON)
 * Nutzt gecachten Wechselkurs
 */
export function convertToEURSync(amount: number, fromCurrency: 'EUR' | 'USD'): number {
  if (fromCurrency === 'EUR') {
    return amount;
  }
  return convertUSDtoEURSync(amount);
}

/**
 * Konvertiert USD zu EUR (ASYNC - lädt aktuellen Rate)
 */
export async function convertUSDtoEUR(amountUSD: number): Promise<number> {
  const rates = await fetchExchangeRates();
  return amountUSD / rates.USD;
}

/**
 * Konvertiert EUR zu USD (ASYNC - lädt aktuellen Rate)
 */
export async function convertEURtoUSD(amountEUR: number): Promise<number> {
  const rates = await fetchExchangeRates();
  return amountEUR * rates.USD;
}

/**
 * Konvertiert beliebigen Betrag zu EUR (ASYNC - lädt aktuellen Rate)
 */
export async function convertToEUR(amount: number, fromCurrency: 'EUR' | 'USD'): Promise<number> {
  if (fromCurrency === 'EUR') {
    return amount;
  }
  return convertUSDtoEUR(amount);
}

/**
 * Initialisiert Wechselkurse (Background-Fetch)
 * Sollte beim App-Start aufgerufen werden
 */
export async function initializeExchangeRates(): Promise<void> {
  try {
    await fetchExchangeRates();
  } catch (err) {
    console.error('Failed to initialize exchange rates:', err);
    throw err;
  }
  
  // Aktualisiere jede Stunde
  setInterval(() => {
    fetchExchangeRates().catch(err => {
      console.error('Failed to refresh exchange rates:', err);
    });
  }, CACHE_DURATION);
}

/**
 * Holt aktuellen USD/EUR Wechselkurs
 */
export async function getUSDtoEURRate(): Promise<number> {
  const rates = await fetchExchangeRates();
  return 1 / rates.USD; // z.B. 0.926 (1 USD = 0.926 EUR)
}

/**
 * Formatiert Betrag mit Währungssymbol
 */
export function formatCurrency(amount: number, currency: 'EUR' | 'USD'): string {
  const formatted = Math.abs(amount).toFixed(2);
  const sign = amount < 0 ? '-' : '';
  
  if (currency === 'USD') {
    return `${sign}$${formatted}`;
  }
  return `${sign}${formatted} €`;
}
