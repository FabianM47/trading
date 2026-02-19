'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { TradeWithPnL } from '@/types';
import { convertToEURSync } from '@/lib/currencyConverter';

interface PortfolioDonutChartProps {
  trades: TradeWithPnL[];
}

export default function PortfolioDonutChart({ trades }: PortfolioDonutChartProps) {
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
      <div className="bg-background-card rounded-card p-6 border border-border shadow-card">
        <h3 className="text-lg font-semibold mb-4">Portfolio-Verteilung</h3>
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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background-elevated border border-border rounded-lg p-3 shadow-xl backdrop-blur-sm">
          <p className="text-sm font-semibold text-text-primary">{payload[0].name}</p>
          <p className="text-lg font-bold text-green-500 mt-1 tabular-nums">
            {formatCurrency(payload[0].value)}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            {((payload[0].value / total) * 100).toFixed(1)}% vom Portfolio
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-background-card rounded-card p-4 sm:p-6 border border-border shadow-card">
      <h3 className="text-lg font-semibold mb-4">Portfolio-Verteilung</h3>
      
      <div className="relative" style={{ height: '340px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={85}
              outerRadius={135}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  style={{
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center Label - Optimierte Position */}
        <div 
          className="absolute pointer-events-none flex flex-col items-center justify-center"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '170px',
          }}
        >
          <div className="text-2xl sm:text-3xl font-bold text-text-primary tabular-nums">
            {formatCurrency(total)}
          </div>
          <div className="text-sm text-text-secondary mt-1.5 font-medium">
            Gesamtwert
          </div>
        </div>
      </div>

      {/* Moderne Legend - Grid Layout */}
      <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2.5 group">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0 transition-transform group-hover:scale-110" 
              style={{ backgroundColor: item.color }}
            />
            <div className="flex-1 min-w-0 flex items-baseline gap-2">
              <span className="text-sm text-text-secondary truncate flex-1" title={item.name}>
                {item.name}
              </span>
              <span className="text-sm text-text-primary font-semibold tabular-nums">
                {((item.value / total) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
