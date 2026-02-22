import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route: TradingView Symbol Search Proxy
 * 
 * Proxy für die TradingView Symbol Search API, um CORS-Probleme zu vermeiden.
 * TradingView blockiert direkte Client-seitige Anfragen mit 403 Forbidden.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query) {
      return NextResponse.json(
        { error: 'Missing query parameter' },
        { status: 400 }
      );
    }

    // Anfrage an TradingView Symbol Search API
    const response = await fetch(
      `https://symbol-search.tradingview.com/symbol_search/?text=${encodeURIComponent(query)}&type=stock,fund,futures,crypto,index`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error(`TradingView API returned ${response.status}`);
      return NextResponse.json(
        { error: 'TradingView API error', status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400', // 1h cache
      },
    });

  } catch (error) {
    console.error('TradingView symbol search proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
