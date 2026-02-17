import { NextRequest, NextResponse } from 'next/server';
import { getQuoteProvider } from '@/lib/quoteProvider';
import { fetchINGInstrumentHeader, extractINGPrice, shouldTryING, isLikelyDerivative, extractDerivativeInfo } from '@/lib/ingQuoteProvider';
import { isCryptoSymbol, fetchCoingeckoPrice } from '@/lib/cryptoQuoteProvider';
import { shouldTryYahoo, fetchYahooQuote } from '@/lib/yahooQuoteProvider';

/**
 * GET /api/quotes/validate?identifier=ISIN_OR_TICKER
 * 
 * Validiert eine ISIN/Ticker und gibt den aktuellen Kurs zurück
 * Erkennt ob Asset im Finnhub Free Plan verfügbar ist
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const identifier = searchParams.get('identifier');
    
    if (!identifier) {
      return NextResponse.json(
        { error: 'Identifier parameter is required' },
        { status: 400 }
      );
    }

    // 🔥 PRIORITÄT 1: Kryptowährungen (Coingecko)
    if (isCryptoSymbol(identifier)) {
      try {
        const quote = await fetchCoingeckoPrice(identifier);
        
        if (quote && quote.price > 0) {
          return NextResponse.json({
            valid: true,
            freePlanLimited: false,
            quote: {
              price: quote.price,
              currency: 'EUR',
              timestamp: quote.timestamp,
            },
            symbolInfo: {
              symbol: quote.ticker || identifier,
              description: `${quote.ticker} (Kryptowährung)`,
              type: 'Cryptocurrency',
            },
            source: 'Coingecko',
          });
        }
      } catch (error) {
        console.log('Coingecko lookup failed:', error);
        // Fahre fort
      }
    }

    // 🔥 PRIORITÄT 2: ING (Derivate, deutsche Wertpapiere)
    const isISIN = identifier.length === 12 && /^[A-Z]{2}[A-Z0-9]{10}$/.test(identifier);
    
    if (isISIN && shouldTryING(identifier)) {
      try {
        const ingData = await fetchINGInstrumentHeader(identifier);
        
        if (ingData) {
          const price = extractINGPrice(ingData);
          
          if (price && price > 0) {
            // Extrahiere Derivate-Informationen
            const derivativeInfo = extractDerivativeInfo(ingData);
            
            // Erfolg mit ING!
            const currency = ingData.currency || 'EUR';
            
            // Konvertiere zu EUR falls nötig
            let priceInEUR = price;
            if (currency !== 'EUR') {
              // Hier würde Währungsumrechnung stattfinden
              // Für jetzt: ING liefert meist EUR
              priceInEUR = price;
            }
            
            return NextResponse.json({
              valid: true,
              freePlanLimited: false,
              quote: {
                price: Math.round(priceInEUR * 100) / 100,
                currency: 'EUR',
                timestamp: Date.now(),
              },
              symbolInfo: {
                symbol: ingData.wkn || identifier,
                description: ingData.name || 'Wertpapier',
                type: derivativeInfo.isDerivative ? 'Derivat/Zertifikat' : 'Wertpapier',
              },
              // Derivate-Informationen hinzufügen
              derivativeInfo: derivativeInfo.isDerivative ? {
                isDerivative: true,
                leverage: derivativeInfo.leverage,
                productType: derivativeInfo.productType,
                underlying: derivativeInfo.underlying,
                knockOut: derivativeInfo.knockOut,
                optionType: derivativeInfo.optionType,
              } : undefined,
              source: 'ING Wertpapiere',
            });
          }
        }
      } catch (error) {
        console.log('ING lookup failed:', error);
        // Fahre fort
      }
    }

    // 🔥 PRIORITÄT 3: Yahoo Finance (Deutsche Aktien, Global)
    if (shouldTryYahoo(identifier)) {
      try {
        const quote = await fetchYahooQuote(identifier);
        
        if (quote && quote.price > 0) {
          return NextResponse.json({
            valid: true,
            freePlanLimited: false,
            quote: {
              price: quote.price,
              currency: quote.currency || 'EUR',
              timestamp: quote.timestamp,
            },
            symbolInfo: {
              symbol: quote.ticker || identifier,
              description: `${quote.ticker}`,
              type: 'Stock',
            },
            source: 'Yahoo Finance',
          });
        }
      } catch (error) {
        console.log('Yahoo lookup failed:', error);
        // Fahre fort mit Finnhub
      }
    }

    // 🔥 PRIORITÄT 4: Finnhub (US-Aktien)
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { 
          valid: false, 
          freePlanLimited: false,
          error: 'Keine Datenquelle verfügbar. Bitte Kaufkurs manuell eingeben.' 
        },
        { status: 503 }
      );
    }

    // Versuche Symbol zu finden via Finnhub Search API
    const symbolInfo = await searchSymbolInfo(identifier, apiKey);
    
    // Wenn Symbol nicht gefunden, prüfe ob es ein Free Plan Problem ist
    if (!symbolInfo) {
      const freePlanIssue = await checkIfFreePlanLimited(identifier, apiKey);
      
      if (freePlanIssue) {
        return NextResponse.json(
          { 
            valid: false, 
            freePlanLimited: true,
            error: 'Im Finnhub Free Plan nicht enthalten',
            details: freePlanIssue.reason
          },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { 
          valid: false, 
          freePlanLimited: false,
          error: 'Symbol nicht gefunden. Bitte überprüfe die ISIN/Ticker oder gib den Kaufkurs manuell ein.' 
        },
        { status: 404 }
      );
    }

    // Versuche Quote zu holen
    const provider = getQuoteProvider();
    const quote = await provider.fetchQuote(identifier);

    if (!quote || quote.price === 0) {
      // Nochmal prüfen ob es ein Free Plan Problem ist
      const freePlanIssue = await checkIfFreePlanLimited(identifier, apiKey);
      
      if (freePlanIssue) {
        return NextResponse.json(
          { 
            valid: false, 
            freePlanLimited: true,
            error: 'Im Finnhub Free Plan nicht enthalten',
            details: freePlanIssue.reason
          },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { 
          valid: false, 
          freePlanLimited: false,
          error: 'Keine aktuellen Kursdaten verfügbar. Bitte Kaufkurs manuell eingeben.' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valid: true,
      freePlanLimited: false,
      quote: {
        price: quote.price,
        currency: quote.currency,
        timestamp: quote.timestamp,
      },
      symbolInfo: symbolInfo ? {
        symbol: symbolInfo.symbol,
        description: symbolInfo.description,
        type: symbolInfo.type,
      } : undefined,
    });
  } catch (error) {
    console.error('Error validating quote:', error);
    return NextResponse.json(
      { 
        valid: false,
        freePlanLimited: false,
        error: 'Fehler beim Abrufen der Kursdaten. Bitte versuche es erneut.' 
      },
      { status: 500 }
    );
  }
}

/**
 * Sucht Symbol-Informationen via Finnhub Search API
 */
async function searchSymbolInfo(identifier: string, apiKey: string) {
  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/search?q=${encodeURIComponent(identifier)}&token=${apiKey}`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (data.result && data.result.length > 0) {
      // Bevorzuge exakte Treffer oder Common Stocks
      const exactMatch = data.result.find((r: any) => 
        r.symbol === identifier || 
        r.displaySymbol === identifier ||
        (identifier.length === 12 && r.description?.includes(identifier)) // ISIN in Beschreibung
      );
      
      if (exactMatch) {
        return {
          symbol: exactMatch.symbol,
          description: exactMatch.description,
          displaySymbol: exactMatch.displaySymbol,
          type: exactMatch.type,
        };
      }
      
      // Nimm erstes Ergebnis als Fallback
      const first = data.result[0];
      return {
        symbol: first.symbol,
        description: first.description,
        displaySymbol: first.displaySymbol,
        type: first.type,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Symbol search failed:', error);
    return null;
  }
}

/**
 * Prüft ob ein Asset durch Free Plan Limitierungen nicht verfügbar ist
 */
async function checkIfFreePlanLimited(identifier: string, apiKey: string) {
  // Erkenne Asset-Typ anhand von Mustern
  
  // 1. Crypto (Finnhub Free Plan: Nur limitierte Cryptos)
  if (identifier.match(/^(BTC|ETH|USDT|BNB|XRP|ADA|SOL|DOGE|TRX|MATIC)/i)) {
    return {
      limited: true,
      reason: 'Kryptowährungen sind im Free Plan nur begrenzt verfügbar. Upgrade für vollständigen Zugriff.'
    };
  }
  
  // 2. Forex/FX (Finnhub Free Plan: Nicht verfügbar)
  if (identifier.match(/^(EUR|USD|GBP|JPY|CHF|CAD|AUD|NZD)[A-Z]{3}$/)) {
    return {
      limited: true,
      reason: 'Forex-Paare sind im Free Plan nicht verfügbar. Upgrade erforderlich.'
    };
  }
  
  // 3. Derivate/Optionen (Finnhub Free Plan: Nicht verfügbar)
  if (identifier.includes('OPT') || identifier.match(/\d{6}[CP]\d+/)) {
    return {
      limited: true,
      reason: 'Optionen und Derivate sind im Free Plan nicht verfügbar. Upgrade erforderlich.'
    };
  }
  
  // 4. Futures (Finnhub Free Plan: Nicht verfügbar)
  if (identifier.match(/^[A-Z]{1,3}\d{2}$/) || identifier.endsWith('F')) {
    return {
      limited: true,
      reason: 'Futures sind im Free Plan nicht verfügbar. Upgrade erforderlich.'
    };
  }
  
  // 5. Exotische Börsen (via ISIN Country Code)
  if (identifier.length === 12) {
    const countryCode = identifier.substring(0, 2);
    const limitedCountries = ['CN', 'IN', 'BR', 'ZA', 'RU', 'TR', 'AR', 'MX', 'ID', 'TH', 'MY', 'PH', 'VN', 'PK', 'BD', 'EG'];
    
    if (limitedCountries.includes(countryCode)) {
      return {
        limited: true,
        reason: `Aktien aus diesem Markt (${countryCode}) sind im Free Plan nur begrenzt verfügbar. Upgrade empfohlen.`
      };
    }
  }
  
  // 6. OTC/Pink Sheets (oft nicht im Free Plan)
  if (identifier.endsWith('.PK') || identifier.endsWith('.OTC')) {
    return {
      limited: true,
      reason: 'OTC-Aktien sind im Free Plan nicht verfügbar. Upgrade erforderlich.'
    };
  }
  
  return null;
}
