'use client';

import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import type { Trade } from '@/types';
import { convertToEURSync } from '@/lib/currencyConverter';

interface PerformanceChartProps {
  trades: Trade[];
}

type TimeRange = '1W' | '1M' | '3M' | '1J' | 'MAX';

export default function PerformanceChart({ trades }: PerformanceChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');

  // Berechne Portfolio-Wert über Zeit
  const chartData = useMemo(() => {
    if (trades.length === 0) return [];

    // Bestimme Zeitraum
    const now = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '1W':
        startDate.setDate(now.getDate() - 7);
        break;
      case '1M':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3M':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '1J':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'MAX':
        // Finde ältesten Trade
        const oldestTrade = trades.reduce((oldest, trade) => {
          const tradeDate = new Date(trade.buyDate);
          return tradeDate < oldest ? tradeDate : oldest;
        }, new Date());
        startDate.setTime(oldestTrade.getTime());
        break;
    }

    // Generiere Datenpunkte
    const dataPoints: { date: string; value: number; invested: number }[] = [];
    const daysDiff = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const numPoints = Math.min(daysDiff, timeRange === '1W' ? 7 : timeRange === '1M' ? 30 : timeRange === '3M' ? 90 : 365);

    for (let i = 0; i <= numPoints; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + Math.floor((i / numPoints) * daysDiff));
      
      // Berechne Portfolio-Wert zu diesem Zeitpunkt
      let totalValue = 0;
      let totalInvested = 0;
      
      trades.forEach(trade => {
        const buyDate = new Date(trade.buyDate);
        
        // Nur Trades einbeziehen die zu diesem Zeitpunkt bereits gekauft waren
        if (buyDate <= date && !trade.isClosed) {
          const currency = trade.currency || 'EUR';
          
          // Nutze currentPrice als Schätzung (in Realität würde man historische Daten nutzen)
          const currentPrice = trade.currentPrice || trade.buyPrice;
          const value = currentPrice * trade.quantity;
          const valueEUR = convertToEURSync(value, currency);
          
          const invested = convertToEURSync(trade.investedEur, currency);
          
          totalValue += valueEUR;
          totalInvested += invested;
        }
      });

      dataPoints.push({
        date: date.toLocaleDateString('de-DE', { 
          day: '2-digit', 
          month: '2-digit',
          ...(timeRange === '1J' || timeRange === 'MAX' ? { year: '2-digit' } : {})
        }),
        value: Math.round(totalValue * 100) / 100,
        invested: Math.round(totalInvested * 100) / 100,
      });
    }

    return dataPoints;
  }, [trades, timeRange]);

  if (trades.length === 0) {
    return (
      <div className="bg-background-card rounded-card p-6 border border-border shadow-card">
        <h3 className="text-lg font-semibold mb-4">Performance</h3>
        <div className="text-center text-text-secondary py-12">
          Keine Trades vorhanden
        </div>
      </div>
    );
  }

  const latestValue = chartData.length > 0 ? chartData[chartData.length - 1].value : 0;
  const earliestValue = chartData.length > 0 ? chartData[0].value : 0;
  const change = latestValue - earliestValue;
  const changePercent = earliestValue > 0 ? ((latestValue / earliestValue - 1) * 100) : 0;
  const isPositive = change >= 0;

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
      const data = payload[0].payload;
      return (
        <div className="bg-background-elevated border border-border rounded-lg p-3 shadow-xl backdrop-blur-sm">
          <p className="text-xs text-text-secondary mb-1">{data.date}</p>
          <p className="text-lg font-bold text-text-primary tabular-nums">
            {formatCurrency(data.value)}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            Investiert: {formatCurrency(data.invested)}
          </p>
        </div>
      );
    }
    return null;
  };

  const timeRanges: TimeRange[] = ['1W', '1M', '3M', '1J', 'MAX'];

  return (
    <div className="bg-background-card rounded-card p-4 sm:p-6 border border-border shadow-card">
      {/* Header mit Wert und Zeitraum-Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-text-secondary mb-2">Portfolio-Wert</h3>
          <div className="text-2xl sm:text-3xl font-bold text-text-primary tabular-nums truncate">
            {formatCurrency(latestValue)}
          </div>
          <div className={`text-sm font-semibold mt-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}{formatCurrency(change)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
          </div>
        </div>

        {/* Zeitraum-Buttons (TradeRepublic Style) */}
        <div className="flex gap-1 bg-background-elevated rounded-lg p-1 shrink-0 overflow-x-auto">
          {timeRanges.map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                timeRange === range
                  ? 'bg-white text-black shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: '340px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 11 }}
              dy={10}
              interval="preserveStartEnd"
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              dx={-5}
              width={45}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#374151', strokeWidth: 1, strokeDasharray: '3 3' }} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={isPositive ? '#22c55e' : '#ef4444'}
              strokeWidth={2.5}
              fill="url(#colorValue)"
              dot={false}
              activeDot={{ r: 4, fill: isPositive ? '#22c55e' : '#ef4444', strokeWidth: 2, stroke: '#1f2937' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
