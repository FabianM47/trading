import { NextRequest, NextResponse } from 'next/server';
import { getQuoteProvider } from '@/lib/quoteProvider';

/**
 * GET /api/quotes/validate?identifier=ISIN_OR_TICKER
 * 
 * Validiert eine ISIN/Ticker und gibt den aktuellen Kurs zurück
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

    const provider = getQuoteProvider();
    const quote = await provider.fetchQuote(identifier);

    if (!quote) {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Keine Kursdaten verfügbar. Bitte überprüfe die ISIN/Ticker oder gib den Kaufkurs manuell ein.' 
        },
        { status: 404 }
      );
    }

    // Wenn Kurs 0 ist, ist die Aktie nicht verfügbar
    if (quote.price === 0) {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Keine aktuellen Kursdaten für diese Aktie verfügbar.' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valid: true,
      quote: {
        price: quote.price,
        currency: quote.currency,
        timestamp: quote.timestamp,
      },
    });
  } catch (error) {
    console.error('Error validating quote:', error);
    return NextResponse.json(
      { 
        valid: false,
        error: 'Fehler beim Abrufen der Kursdaten. Bitte versuche es erneut.' 
      },
      { status: 500 }
    );
  }
}
