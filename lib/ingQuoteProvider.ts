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
  
  // Derivate-spezifische Felder (oft in 'attributes' oder direkt)
  productType?: string;        // z.B. "Turbo", "Optionsschein", "Zertifikat"
  leverage?: number;            // Hebel (z.B. 5.0)
  knockOut?: number;            // Knock-Out Schwelle
  strike?: number;              // Basispreis / Strike
  underlying?: string;          // Underlying / Basiswert (z.B. "DAX")
  underlyingIsin?: string;      // ISIN des Basiswerts
  optionType?: 'call' | 'put'; // Bei Optionsscheinen
  expiryDate?: string;          // Verfallsdatum
  
  // Weitere mögliche Felder
  [key: string]: any;           // Catch-all für unbekannte Felder
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
 * Extrahiert Derivate-Informationen aus ING-Daten
 */
export function extractDerivativeInfo(data: INGInstrumentHeader): {
  isDerivative: boolean;
  leverage?: number;
  productType?: string;
  underlying?: string;
  knockOut?: number;
  strike?: number;
  optionType?: 'call' | 'put';
} {
  const result: any = {
    isDerivative: false,
  };

  // Prüfe Produkttyp aus Name
  const name = (data.name || '').toLowerCase();
  
  // Erkenne Derivate-Typen aus dem Namen
  if (name.includes('turbo') || name.includes('knock-out') || name.includes('knockout')) {
    result.isDerivative = true;
    result.productType = name.includes('turbo') ? 'Turbo' : 'Knock-Out';
  } else if (name.includes('optionsschein') || name.includes('option')) {
    result.isDerivative = true;
    result.productType = 'Optionsschein';
    // Erkenne Call/Put
    if (name.includes('call')) result.optionType = 'call';
    if (name.includes('put')) result.optionType = 'put';
  } else if (name.includes('factor') || name.includes('faktor')) {
    result.isDerivative = true;
    result.productType = 'Faktor-Zertifikat';
  } else if (name.includes('zertifikat') || name.includes('certificate')) {
    result.isDerivative = true;
    result.productType = 'Zertifikat';
  }

  // Extrahiere Hebel aus dem Namen (z.B. "5x", "x5", "Hebel 5")
  const leverageMatch = name.match(/(?:hebel|leverage|faktor|factor)[\s:]*(\d+(?:[,.]\d+)?)|(\d+(?:[,.]\d+)?)[\s]*x/i);
  if (leverageMatch) {
    const leverageStr = leverageMatch[1] || leverageMatch[2];
    result.leverage = parseFloat(leverageStr.replace(',', '.'));
  }

  // Nutze direkte Felder falls vorhanden
  if (data.leverage) result.leverage = data.leverage;
  if (data.productType) result.productType = data.productType;
  if (data.underlying) result.underlying = data.underlying;
  if (data.knockOut) result.knockOut = data.knockOut;
  if (data.strike) result.strike = data.strike;
  if (data.optionType) result.optionType = data.optionType;

  // Wenn wir einen Hebel haben, ist es definitiv ein Derivat
  if (result.leverage && result.leverage > 1) {
    result.isDerivative = true;
  }

  return result;
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
