'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-bold text-white mb-3">Etwas ist schiefgelaufen</h2>
        <p className="text-text-secondary mb-6 text-sm">
          {error.message || 'Ein unerwarteter Fehler ist aufgetreten.'}
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors font-medium"
        >
          Erneut versuchen
        </button>
      </div>
    </div>
  );
}
