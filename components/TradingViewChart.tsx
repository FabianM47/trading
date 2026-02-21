'use client';

import { useEffect, useRef, useState } from 'react';
import { TrendingUp } from 'lucide-react';

// TradingView Widget TypeScript Definitions
declare global {
  interface Window {
    TradingView?: {
      widget: new (config: TradingViewWidgetConfig) => void;
    };
  }
}

interface TradingViewWidgetConfig {
  container_id: string;
  symbol: string;
  interval: string;
  timezone: string;
  theme: 'light' | 'dark';
  style: string;
  locale: string;
  toolbar_bg: string;
  enable_publishing: boolean;
  hide_top_toolbar?: boolean;
  hide_legend?: boolean;
  save_image?: boolean;
  height: number;
  width: string;
  studies?: string[];
  show_popup_button?: boolean;
  popup_width?: string;
  popup_height?: string;
}

interface TradingViewChartProps {
  symbol: string;  // z.B. "NASDAQ:AAPL" oder "XETRA:DAX"
  theme?: 'light' | 'dark';
  height?: number;
}

/**
 * TradingView Chart Widget Komponente
 * 
 * Zeigt einen interaktiven Chart von TradingView an.
 * Das Widget wird über ein externes Script geladen.
 * 
 * Features:
 * - Loading State mit Spinner
 * - Error State mit Fallback Link zu TradingView
 * - Automatische Symbol-Erkennung
 */
export default function TradingViewChart({ 
  symbol, 
  theme = 'dark', 
  height = 500 
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetInstanceRef = useRef<any>(null);
  const [loadError, setLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setLoadError(false);
    setIsLoading(true);

    // Cleanup function für vorheriges Widget
    const cleanup = () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      widgetInstanceRef.current = null;
    };

    cleanup();

    // Prüfe ob Script bereits geladen ist
    const existingScript = document.querySelector('script[src="https://s3.tradingview.com/tv.js"]');
    
    if (existingScript && typeof window.TradingView !== 'undefined') {
      // Script ist bereits geladen, initialisiere Widget direkt
      initializeWidget();
      return;
    }

    // Lade TradingView Script
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.type = 'text/javascript';
    script.crossOrigin = 'anonymous';
    
    script.onload = () => {
      initializeWidget();
    };

    script.onerror = (error) => {
      console.error('Failed to load TradingView script:', error);
      setLoadError(true);
      setIsLoading(false);
    };

    document.head.appendChild(script);

    function initializeWidget() {
      if (typeof window.TradingView !== 'undefined' && containerRef.current) {
        try {
          widgetInstanceRef.current = new window.TradingView.widget({
            container_id: containerRef.current.id,
            symbol: symbol,
            interval: 'D', // Daily
            timezone: 'Europe/Berlin',
            theme: theme,
            style: '1', // Candlestick
            locale: 'de_DE',
            toolbar_bg: theme === 'dark' ? '#1a1a1a' : '#f1f3f6',
            enable_publishing: false,
            hide_top_toolbar: false,
            hide_legend: false,
            save_image: false,
            height: height,
            width: '100%',
            studies: [
              'MASimple@tv-basicstudies', // Moving Average
            ],
            show_popup_button: true,
            popup_width: '1000',
            popup_height: '650',
          });
          setIsLoading(false);
        } catch (error) {
          console.error('TradingView Widget Error:', error);
          setLoadError(true);
          setIsLoading(false);
        }
      } else {
        // Fallback wenn TradingView nicht verfügbar ist
        setTimeout(() => {
          if (typeof window.TradingView === 'undefined') {
            setLoadError(true);
            setIsLoading(false);
          }
        }, 5000); // 5 Sekunden Timeout
      }
    }

    return () => {
      cleanup();
      if (script.parentNode) {
        try {
          script.parentNode.removeChild(script);
        } catch (e) {
          // Script wurde möglicherweise bereits entfernt
        }
      }
    };
  }, [symbol, theme, height]);

  // Eindeutige Container-ID basierend auf Symbol
  const containerId = `tradingview_${symbol.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;

  return (
    <div className="w-full rounded-lg overflow-hidden bg-background-elevated relative" style={{ minHeight: height }}>
      {/* Loading State */}
      {isLoading && !loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background-elevated">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-3"></div>
            <p className="text-text-secondary text-sm">Chart wird geladen...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background-elevated border border-border rounded-lg">
          <div className="text-center p-6">
            <TrendingUp className="w-12 h-12 text-text-secondary mx-auto mb-3 opacity-50" />
            <h3 className="text-lg font-semibold text-white mb-2">Chart nicht verfügbar</h3>
            <p className="text-text-secondary text-sm mb-4">
              Der TradingView Chart konnte nicht geladen werden.
            </p>
            <a
              href={`https://www.tradingview.com/chart/?symbol=${symbol}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors text-sm font-medium"
            >
              Auf TradingView öffnen →
            </a>
          </div>
        </div>
      )}

      {/* TradingView Container */}
      <div 
        id={containerId} 
        ref={containerRef}
        className={isLoading || loadError ? 'opacity-0' : 'opacity-100'}
        style={{ minHeight: height }}
      />
    </div>
  );
}

/**
 * Hilfsfunktion: Konvertiert ISIN/Ticker zu TradingView Symbol
 * 
 * Beispiele:
 * - US0378331005 (AAPL) → NASDAQ:AAPL
 * - DE0005140008 (DAX) → XETRA:DAX
 * - AAPL → NASDAQ:AAPL
 * - BTC → BINANCE:BTCUSDT
 */
export function getTradingViewSymbol(
  ticker?: string, 
  isin?: string,
  productType?: string
): string {
  // Crypto Detection
  const cryptoTickers = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX'];
  if (ticker && cryptoTickers.includes(ticker.toUpperCase())) {
    return `BINANCE:${ticker.toUpperCase()}USDT`;
  }

  // ISIN-basierte Börsen-Zuordnung
  if (isin) {
    const countryCode = isin.substring(0, 2);
    
    switch (countryCode) {
      case 'US':
        // US-Aktien → NASDAQ (oder NYSE)
        return `NASDAQ:${ticker || isin}`;
      
      case 'DE':
        // Deutsche Aktien/Derivate → XETRA
        const cleanTicker = ticker?.split('.')[0] || isin;
        
        // Spezielle Indizes
        if (cleanTicker.includes('DAX')) return 'XETRA:DAX';
        if (cleanTicker.includes('MDAX')) return 'XETRA:MDAX';
        if (cleanTicker.includes('SDAX')) return 'XETRA:SDAX';
        
        return `XETRA:${cleanTicker}`;
      
      case 'GB':
        // UK → LSE
        return `LSE:${ticker || isin}`;
      
      case 'FR':
        // Frankreich → EURONEXT
        return `EURONEXT:${ticker || isin}`;
      
      case 'NL':
        // Niederlande → EURONEXT
        return `EURONEXT:${ticker || isin}`;
      
      case 'CH':
        // Schweiz → SIX
        return `SIX:${ticker || isin}`;
      
      case 'JP':
        // Japan → TSE
        return `TSE:${ticker || isin}`;
      
      case 'CN':
      case 'HK':
        // China/Hong Kong → HKEX
        return `HKEX:${ticker || isin}`;
    }
  }

  // Ticker-basierte Fallback-Logik
  if (ticker) {
    // Wenn Ticker ein Punkt enthält (z.B. SAP.DE), versuche zu parsen
    if (ticker.includes('.')) {
      const [symbol, exchange] = ticker.split('.');
      switch (exchange?.toUpperCase()) {
        case 'DE':
        case 'F':
        case 'XETRA':
          return `XETRA:${symbol}`;
        case 'US':
        case 'NASDAQ':
          return `NASDAQ:${symbol}`;
        case 'NYSE':
          return `NYSE:${symbol}`;
      }
    }

    // Standard: Annahme US-Aktie
    return `NASDAQ:${ticker}`;
  }

  // Absolute Fallback
  return isin || ticker || 'NASDAQ:AAPL';
}
