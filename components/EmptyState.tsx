'use client';

interface EmptyStateProps {
  onAddTrade: () => void;
}

export default function EmptyState({ onAddTrade }: EmptyStateProps) {
  return (
    <div className="bg-background-card rounded-card p-12 border border-border shadow-card text-center">
      <div className="max-w-md mx-auto">
        <div className="mb-6 flex justify-center">
          <svg className="w-24 h-24 text-text-primary opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold mb-2">Noch keine Trades</h3>
        <p className="text-text-secondary mb-6">
          Füge deinen ersten Trade hinzu, um dein Portfolio zu tracken und
          Gewinne/Verluste zu analysieren.
        </p>
        <button
          onClick={onAddTrade}
          className="bg-white text-black px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all transform hover:scale-105 inline-flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Ersten Trade hinzufügen
        </button>
      </div>
    </div>
  );
}
