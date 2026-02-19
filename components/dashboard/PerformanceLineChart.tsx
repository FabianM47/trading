'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useState } from 'react';

type TimeRange = '1W' | '1M' | 'YTD' | '1J' | '3J' | '5J' | 'MAX';
type Tab = 'wert' | 'performance' | 'dividende';

interface PerformanceLineChartProps {
  selectedRange: TimeRange;
  selectedTab: Tab;
  onTabChange: (tab: Tab) => void;
}

// Mock-Daten für Performance-Chart
const generateMockData = (range: TimeRange) => {
  const baseValue = 30000;
  const invested = 28000;
  const dataPoints = range === '1W' ? 7 : range === '1M' ? 30 : range === '1J' ? 365 : 1095;
  
  return Array.from({ length: dataPoints }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (dataPoints - i));
    
    const volatility = Math.sin(i / 10) * 500 + Math.random() * 300;
    const trend = (i / dataPoints) * 5000;
    
    return {
      date: date.toLocaleDateString('de-DE', { 
        month: 'short', 
        year: range !== '1W' ? '2-digit' : undefined,
        day: range === '1W' ? 'numeric' : undefined
      }),
      portfolio: Math.round(baseValue + trend + volatility),
      invested: invested + (i / dataPoints) * 10000,
    };
  });
};

export default function PerformanceLineChart({ selectedRange, selectedTab, onTabChange }: PerformanceLineChartProps) {
  const [showInvested, setShowInvested] = useState(true);
  const data = generateMockData(selectedRange);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-xs text-text-secondary mb-2">{payload[0].payload.date}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm font-medium">
                {entry.name}: {entry.value.toLocaleString('de-DE')}€
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-background-card rounded-lg p-6 border border-border shadow-card h-full">
      {/* Tabs */}
      <div className="flex gap-6 mb-6 border-b border-border">
        <button
          onClick={() => onTabChange('wert')}
          className={`pb-2 px-1 text-sm font-medium transition-colors relative ${
            selectedTab === 'wert' 
              ? 'text-blue-500' 
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Wert
          {selectedTab === 'wert' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
          )}
        </button>
        <button
          onClick={() => onTabChange('performance')}
          className={`pb-2 px-1 text-sm font-medium transition-colors relative ${
            selectedTab === 'performance' 
              ? 'text-blue-500' 
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Performance
          {selectedTab === 'performance' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
          )}
        </button>
        <button
          onClick={() => onTabChange('dividende')}
          className={`pb-2 px-1 text-sm font-medium transition-colors relative ${
            selectedTab === 'dividende' 
              ? 'text-blue-500' 
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Dividende
          {selectedTab === 'dividende' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
          )}
        </button>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
          <XAxis 
            dataKey="date" 
            stroke="#666" 
            tick={{ fill: '#888', fontSize: 12 }}
            tickLine={{ stroke: '#444' }}
          />
          <YAxis 
            stroke="#666" 
            tick={{ fill: '#888', fontSize: 12 }}
            tickLine={{ stroke: '#444' }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="portfolio" 
            stroke="#10b981" 
            strokeWidth={2}
            dot={false}
            name="Portfolio"
          />
          {showInvested && (
            <Line 
              type="monotone" 
              dataKey="invested" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={false}
              name="Investiertes Kapital"
              strokeDasharray="5 5"
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Toggle für investiertes Kapital */}
      <div className="mt-4 flex items-center justify-end">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showInvested}
            onChange={(e) => setShowInvested(e.target.checked)}
            className="w-5 h-5 rounded bg-background-elevated border-border checked:bg-blue-500 checked:border-blue-500 cursor-pointer"
          />
          <span className="text-sm text-text-secondary">Investiertes Kapital</span>
        </label>
      </div>
    </div>
  );
}
