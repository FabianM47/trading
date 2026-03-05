'use client';

import { useState } from 'react';
import type { SystemError, SystemErrorCategory } from '@/types';

interface ErrorIndicatorProps {
  errors: SystemError[];
  onDismiss?: (id: string) => void;
  onDismissAll?: () => void;
}

const categoryConfig: Record<SystemErrorCategory, { label: string; icon: string; color: string }> = {
  provider: { label: 'Kurs-Provider', icon: '📡', color: 'bg-orange-500' },
  exchange_rate: { label: 'Wechselkurse', icon: '💱', color: 'bg-red-600' },
  network: { label: 'Netzwerk', icon: '🌐', color: 'bg-red-500' },
  general: { label: 'Allgemein', icon: '⚠️', color: 'bg-gray-600' },
};

export default function ErrorIndicator({ errors, onDismiss, onDismissAll }: ErrorIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (errors.length === 0) {
    return null;
  }

  // Gruppiere Fehler nach Kategorie
  const grouped = errors.reduce<Record<SystemErrorCategory, SystemError[]>>((acc, err) => {
    if (!acc[err.category]) acc[err.category] = [];
    acc[err.category].push(err);
    return acc;
  }, {} as Record<SystemErrorCategory, SystemError[]>);

  // Hat kritische Fehler? (exchange_rate oder network)
  const hasCritical = errors.some(e => e.category === 'exchange_rate' || e.category === 'network');

  return (
    <>
      {/* Error Triangle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${hasCritical ? 'bg-red-600 animate-pulse' : 'bg-orange-500'} text-white p-2 rounded-lg shadow-lg hover:brightness-110 transition-all flex items-center gap-2`}
        title="Systemfehler anzeigen"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <span className="text-sm font-semibold">{errors.length}</span>
      </button>

      {/* Error Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-start justify-end p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-md w-full mt-16 mr-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`${hasCritical ? 'bg-red-600' : 'bg-orange-500'} text-white px-4 py-3 flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <h3 className="font-semibold">
                  {errors.length} Systemfehler
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/20 p-1 rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content - gruppiert nach Kategorie */}
            <div className="p-4 max-h-96 overflow-y-auto space-y-4">
              {(Object.entries(grouped) as [SystemErrorCategory, SystemError[]][]).map(([category, categoryErrors]) => {
                const config = categoryConfig[category];
                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`${config.color} text-white text-xs px-2 py-0.5 rounded-full font-medium`}>
                        {config.icon} {config.label}
                      </span>
                      <span className="text-xs text-gray-400">{categoryErrors.length}</span>
                    </div>
                    <ul className="space-y-2">
                      {categoryErrors.map((error) => (
                        <li
                          key={error.id}
                          className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-red-800">{error.message}</p>
                              {error.details && (
                                <p className="text-red-600 text-xs mt-1">{error.details}</p>
                              )}
                              <p className="text-gray-400 text-xs mt-1">
                                {new Date(error.timestamp).toLocaleTimeString('de-DE')}
                              </p>
                            </div>
                            {onDismiss && (
                              <button
                                onClick={() => onDismiss(error.id)}
                                className="text-gray-400 hover:text-red-500 flex-shrink-0"
                                title="Fehler ausblenden"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex gap-2">
              {onDismissAll && errors.length > 1 && (
                <button
                  onClick={() => {
                    onDismissAll();
                    setIsOpen(false);
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
                >
                  Alle ausblenden
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors font-medium text-sm"
              >
                Schliessen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
