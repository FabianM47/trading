/**
 * ING Quote Provider
 * 
 * Holt Kursdaten von ING Wertpapiere API (kostenlos, keine API-Key nötig)
 * Besonders gut für: Derivate, Zertifikate, Optionsscheine, deutsche Wertpapiere
 */

export interface INGInstrumentHeader {
  price?: number;
  bid?: number;
  ask?: number;
  currency?: string;
  name?: string;
  isin?: string;
  wkn?: string;
  // ... weitere Felder nach Bedarf
}

/**
 * Holt Instrumentendaten von ING Wertpapiere API
 * @param isin Die ISIN des Wertpapiers
 * @returns Instrumentendaten oder null bei Fehler
 */
export async function fetchINGInstrumentHeader(isin: string): Promise<INGInstrumentHeader | null> {
  try {
    const url = `https://component-api.wertpapiere.ing.de/api/v1/components/instrumentheader/${isin}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Origin': 'https://wertpapiere.ing.de',
        'Referer': 'https://wertpapiere.ing.de/',
        'Accept': 'application/json',
      },
      // Timeout nach 10 Sekunden
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.log(`ING API returned ${response.status} for ISIN ${isin}`);
      return null;
    }

    const data = await response.json();
    
    // Prüfe ob Preis vorhanden ist
    if (!data.price && !data.bid && !data.ask) {
      console.log(`No price data from ING for ISIN ${isin}`);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`Error fetching ING data for ${isin}:`, error);
    return null;
  }
}

/**
 * Extrahiert den besten verfügbaren Preis aus ING-Daten
 * Priorität: price > midpoint(bid/ask) > bid > ask
 */
export function extractINGPrice(data: INGInstrumentHeader): number | null {
  // 1. Direkter Preis
  if (data.price && data.price > 0) {
    return data.price;
  }

  // 2. Mittelwert aus Bid/Ask (Spread)
  if (data.bid && data.ask && data.bid > 0 && data.ask > 0) {
    return (data.bid + data.ask) / 2;
  }

  // 3. Nur Bid
  if (data.bid && data.bid > 0) {
    return data.bid;
  }

  // 4. Nur Ask
  if (data.ask && data.ask > 0) {
    return data.ask;
  }

  return null;
}

/**
 * Erkennt ob eine ISIN wahrscheinlich ein Derivat ist
 */
export function isLikelyDerivative(isin: string): boolean {
  // Deutsche Derivate starten oft mit DE000
  if (isin.startsWith('DE000')) {
    return true;
  }

  // Weitere Muster für Derivate können hier ergänzt werden
  // z.B. bestimmte Emittenten-Codes

  return false;
}

/**
 * Prüft ob ISIN im ING-System verfügbar sein könnte
 */
export function shouldTryING(isin: string): boolean {
  if (!isin || isin.length !== 12) {
    return false;
  }

  const countryCode = isin.substring(0, 2);
  
  // ING hat hauptsächlich deutsche und europäische Wertpapiere
  const supportedCountries = ['DE', 'AT', 'NL', 'FR', 'BE', 'LU', 'CH', 'IT', 'ES'];
  
  return supportedCountries.includes(countryCode);
}
