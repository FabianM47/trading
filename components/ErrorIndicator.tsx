'use client';

import { useState } from 'react';

interface ErrorIndicatorProps {
  errors: string[];
}

export default function ErrorIndicator({ errors }: ErrorIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (errors.length === 0) {
    return null;
  }

  return (
    <>
      {/* Error Triangle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-red-500 text-white p-2 rounded-lg shadow-lg hover:bg-red-600 transition-all flex items-center gap-2"
        title="Fehler anzeigen"
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
            <div className="bg-red-500 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <h3 className="font-semibold">Systemfehler</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-red-600 p-1 rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 max-h-96 overflow-y-auto">
              <p className="text-sm text-gray-600 mb-3">
                Die folgenden Probleme sind aufgetreten:
              </p>
              <ul className="space-y-2">
                {errors.map((error, index) => (
                  <li
                    key={index}
                    className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">•</span>
                      <span>{error}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors font-medium"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
