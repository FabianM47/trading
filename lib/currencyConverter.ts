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
 * Holt aktuelle Wechselkurse von der ECB (European Central Bank)
 * Kostenlos, keine API-Key nötig, reliable
 */
async function fetchExchangeRates(): Promise<ExchangeRates> {
  // Prüfe Cache
  if (cachedRates && Date.now() - cachedRates.timestamp < CACHE_DURATION) {
    return cachedRates;
  }

  try {
    // ECB API: https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml
    // Alternativ: Frankfurter API (kostenlos, JSON)
    const response = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD');
    
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }

    const data = await response.json();
    
    const rates: ExchangeRates = {
      EUR: 1.0,
      USD: data.rates.USD || 1.08, // Fallback ca. 1.08
      timestamp: Date.now(),
    };

    cachedRates = rates;
    currentRate = rates.USD; // Aktualisiere synchronen Rate
    return rates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    
    // Fallback auf gecachte Rates oder hardcoded default
    if (cachedRates) {
      console.warn('Using cached exchange rates (may be outdated)');
      return cachedRates;
    }
    
    // Hardcoded fallback (ca. aktueller Kurs Feb 2026)
    const fallbackRates: ExchangeRates = {
      EUR: 1.0,
      USD: 1.08,
      timestamp: Date.now(),
    };
    
    cachedRates = fallbackRates;
    return fallbackRates;
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
export function initializeExchangeRates(): void {
  fetchExchangeRates().catch(err => {
    console.error('Failed to initialize exchange rates:', err);
  });
  
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
