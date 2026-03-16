'use client';

import { Info } from 'lucide-react';

export default function NewsDisclaimer() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
      <Info size={14} className="mt-0.5 shrink-0 text-amber-400" />
      <p className="text-xs text-zinc-400">
        <span className="font-semibold text-amber-400">Hinweis:</span>{' '}
        Die hier dargestellten Analysen werden automatisch von einer KI erstellt
        und stellen <span className="font-semibold text-zinc-300">keine Anlageberatung</span> dar.
        Alle Informationen dienen ausschließlich zu Informationszwecken.
      </p>
    </div>
  );
}
