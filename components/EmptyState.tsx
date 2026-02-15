'use client';

interface EmptyStateProps {
  onAddTrade: () => void;
}

export default function EmptyState({ onAddTrade }: EmptyStateProps) {
  return (
    <div className="bg-background-card rounded-card p-12 border border-border shadow-card text-center">
      <div className="max-w-md mx-auto">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-semibold mb-2">Noch keine Trades</h3>
        <p className="text-text-secondary mb-6">
          Füge deinen ersten Trade hinzu, um dein Portfolio zu tracken und
          Gewinne/Verluste zu analysieren.
        </p>
        <button
          onClick={onAddTrade}
          className="bg-white text-black px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all transform hover:scale-105"
        >
          Ersten Trade hinzufügen
        </button>
      </div>
    </div>
  );
}
