'use client';

interface EmptyStateProps {
  onAddTrade: () => void;
}

export default function EmptyState({ onAddTrade }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-lg p-12 border border-gray-200 text-center">
      <div className="max-w-md mx-auto">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-semibold mb-2">Noch keine Trades</h3>
        <p className="text-gray-600 mb-6">
          Füge deinen ersten Trade hinzu, um dein Portfolio zu tracken und
          Gewinne/Verluste zu analysieren.
        </p>
        <button
          onClick={onAddTrade}
          className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          Ersten Trade hinzufügen
        </button>
      </div>
    </div>
  );
}
