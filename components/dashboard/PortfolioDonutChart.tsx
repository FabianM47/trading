'use client';

import { useState, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { TradeWithPnL } from '@/types';
import { convertToEURSync } from '@/lib/currencyConverter';

interface PortfolioDonutChartProps {
  trades: TradeWithPnL[];
}

export default function PortfolioDonutChart({ trades }: PortfolioDonutChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Gruppiere Trades nach Ticker/ISIN und berechne Gesamtwert IN EUR
  const portfolioData = trades.reduce((acc, trade) => {
    const key = trade.ticker || trade.name || trade.isin || 'Unknown';
    const currency = trade.currency || 'EUR';
    
    // Berechne Wert und konvertiere zu EUR
    const valueInOriginalCurrency = trade.currentPrice * trade.quantity;
    const valueInEUR = convertToEURSync(valueInOriginalCurrency, currency);
    
    if (!acc[key]) {
      acc[key] = { name: key, value: 0, color: '' };
    }
    acc[key].value += valueInEUR;
    
    return acc;
  }, {} as Record<string, { name: string; value: number; color: string }>);

  // Konvertiere zu Array und sortiere nach Wert
  const data = Object.values(portfolioData)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10); // Top 10 Positionen

  // TradeRepublic-Style Farben (moderner, gedeckter)
  const colors = [
    '#22c55e', // Grün
    '#3b82f6', // Blau
    '#a855f7', // Lila
    '#f59e0b', // Orange
    '#ef4444', // Rot
    '#06b6d4', // Cyan
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#f97316', // Orange-Rot
    '#8b5cf6', // Indigo
  ];
  
  data.forEach((item, index) => {
    item.color = colors[index % colors.length];
  });

  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (data.length === 0) {
    return (
      <div className="bg-background-card rounded-card p-4 sm:p-6 border border-border shadow-card">
        <h3 className="text-base sm:text-lg font-semibold mb-4">Portfolio-Verteilung</h3>
        <div className="text-center text-text-secondary py-12">
          Keine offenen Positionen
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Aktives Segment per Klick umschalten
  const onPieClick = useCallback((_: any, index: number) => {
    setActiveIndex(prev => prev === index ? null : index);
  }, []);

  const selectedItem = activeIndex !== null ? data[activeIndex] : null;

  return (
    <div className="bg-background-card rounded-card p-4 sm:p-6 border border-border shadow-card">
      <h3 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 text-text-secondary">Portfolio-Verteilung</h3>
      
      <div className="relative h-[240px] sm:h-[300px] lg:h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="85%"
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
              onClick={onPieClick}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  style={{
                    opacity: activeIndex !== null && activeIndex !== index ? 0.35 : 1,
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    filter: activeIndex === index 
                      ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' 
                      : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                    transform: activeIndex === index ? 'scale(1.05)' : 'scale(1)',
                    transformOrigin: 'center',
                  }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center Label – zeigt Gesamtwert oder selektiertes Segment */}
        <div 
          className="absolute pointer-events-none flex flex-col items-center justify-center"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '140px',
          }}
        >
          {selectedItem ? (
            <>
              <div className="text-xs sm:text-sm font-medium text-text-secondary text-center truncate w-full px-1">
                {selectedItem.name}
              </div>
              <div className="text-lg sm:text-2xl font-bold tabular-nums mt-0.5" style={{ color: selectedItem.color }}>
                {formatCurrency(selectedItem.value)}
              </div>
              <div className="text-xs text-text-tertiary mt-0.5">
                {((selectedItem.value / total) * 100).toFixed(1)}%
              </div>
            </>
          ) : (
            <>
              <div className="text-lg sm:text-2xl font-bold text-text-primary tabular-nums">
                {formatCurrency(total)}
              </div>
              <div className="text-xs sm:text-sm text-text-secondary mt-1 font-medium">
                Gesamtwert
              </div>
            </>
          )}
        </div>
      </div>

      {/* Moderne Legend - Grid Layout */}
      <div className="mt-3 sm:mt-6 grid grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-2 sm:gap-y-3">
        {data.map((item, index) => (
          <div 
            key={index} 
            className={`flex items-center gap-2 group cursor-pointer rounded-md px-1.5 py-1 -mx-1.5 transition-colors ${
              activeIndex === index ? 'bg-background-elevated' : 'hover:bg-background-elevated/50'
            }`}
            onClick={() => setActiveIndex(prev => prev === index ? null : index)}
          >
            <div 
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0 transition-transform group-hover:scale-110" 
              style={{ backgroundColor: item.color }}
            />
            <div className="flex-1 min-w-0 flex items-baseline gap-1 sm:gap-2">
              <span className="text-xs sm:text-sm text-text-secondary truncate flex-1" title={item.name}>
                {item.name}
              </span>
              <span className="text-xs sm:text-sm text-text-primary font-semibold tabular-nums flex-shrink-0">
                {((item.value / total) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
