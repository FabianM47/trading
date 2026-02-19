'use client';

import { useEffect, useRef } from 'react';
import type { MarketIndex } from '@/types';
import { formatCurrency, formatPercent, getPnLColorClass } from '@/lib/calculations';

interface IndexCardsProps {
  indices: MarketIndex[];
  isLoading?: boolean;
}

export default function IndexCards({ indices, isLoading = false }: IndexCardsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || indices.length === 0) return;

    let scrollPosition = 0;
    const scrollSpeed = 0.3; // Pixel pro Frame (etwas langsamer für bessere Lesbarkeit)
    let lastTimestamp = 0;

    const scroll = (timestamp: number) => {
      if (!container) return;

      // Delta-Zeit für konsistente Geschwindigkeit unabhängig von Framerate
      if (lastTimestamp === 0) lastTimestamp = timestamp;
      const deltaTime = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      // Verwende deltaTime für gleichmäßige Bewegung (ca. 60fps = 16.67ms)
      scrollPosition += scrollSpeed * (deltaTime / 16.67);
      
      // Berechne die Breite eines einzelnen Sets
      const singleSetWidth = container.scrollWidth / 3; // Wir haben 3 Kopien
      
      // Wenn wir ein komplettes Set durchgescrollt haben, reset zur ersten Kopie
      if (scrollPosition >= singleSetWidth) {
        scrollPosition = scrollPosition % singleSetWidth;
      }
      
      container.scrollLeft = scrollPosition;
      
      requestAnimationFrame(scroll);
    };

    // Start animation
    const animationFrameId = requestAnimationFrame(scroll);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [indices.length]);

  if (indices.length === 0) {
    return null;
  }

  // Tripliziere die Indizes für einen nahtlosen Infinite-Loop
  const triplicatedIndices = [...indices, ...indices, ...indices];

  return (
    <div className="overflow-hidden mb-3 -mx-4 px-4 relative">
      <div 
        ref={scrollContainerRef}
        className="flex gap-2 overflow-x-hidden"
        style={{ 
          scrollBehavior: 'auto',
          willChange: 'scroll-position',
        }}
      >
        {triplicatedIndices.map((index, idx) => {
          const isPositive = index.change >= 0;
          const changeColor = index.price > 0 
            ? (isPositive ? 'text-green-500' : 'text-red-500')
            : 'text-text-secondary';
          
          return (
            <div
              key={`${index.ticker}-${idx}`}
              className="bg-background-card rounded-md px-2.5 py-1.5 border border-border shadow-sm flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
            >
              <span className="text-[10px] text-text-secondary font-medium tracking-wide" title={index.name}>
                {index.name}
              </span>
              <span className={`text-xs font-semibold tabular-nums ${changeColor} flex items-center gap-0.5`}>
                {index.price > 0 ? (
                  <>
                    <span 
                      className={`inline-block text-[9px] ${isLoading ? 'animate-spin' : ''}`}
                      style={{
                        animation: isLoading 
                          ? 'spin 1s linear infinite' 
                          : 'none'
                      }}
                    >
                      {isPositive ? '▲' : '▼'}
                    </span>
                    <span>{Math.abs(index.change).toFixed(2)}%</span>
                  </>
                ) : (
                  '—'
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
