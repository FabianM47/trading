'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Info, ArrowLeft, Sparkles } from 'lucide-react';
import type { SankeyConfig } from '@/types/sankey';
import { createDefaultSankeyConfig } from '@/types/sankey';
import { loadSankeyConfig, saveSankeyConfig } from '@/lib/sankeyStorage';
import SankeyDiagram from '@/components/sankey/SankeyDiagram';
import SankeyForm from '@/components/sankey/SankeyForm';

export default function SankeyPage() {
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [config, setConfig] = useState<SankeyConfig>(createDefaultSankeyConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auth-Check
  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/logto/user');
        const data = await response.json();
        if (data.isAuthenticated) {
          setIsAuthenticated(true);
          setIsAuthChecking(false);
        } else {
          window.location.href = '/api/logto/sign-in';
        }
      } catch {
        window.location.href = '/api/logto/sign-in';
      }
    }
    checkAuth();
  }, []);

  // Daten laden
  useEffect(() => {
    if (isAuthenticated) {
      loadSankeyConfig().then((loaded) => {
        setConfig(loaded);
        setLastSaved(loaded.updatedAt);
      });
    }
  }, [isAuthenticated]);

  // Auto-Save mit Debounce (1.5s nach letzter Änderung)
  const handleConfigChange = useCallback(
    (newConfig: SankeyConfig) => {
      setConfig(newConfig);

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        setIsSaving(true);
        const success = await saveSankeyConfig(newConfig);
        if (success) {
          setLastSaved(new Date().toISOString());
        }
        setIsSaving(false);
      }, 1500);
    },
    []
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Reset
  const handleReset = useCallback(async () => {
    const fresh = createDefaultSankeyConfig();
    setConfig(fresh);
    setIsSaving(true);
    await saveSankeyConfig(fresh);
    setLastSaved(new Date().toISOString());
    setIsSaving(false);
  }, []);

  // Loading State
  if (isAuthChecking) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-accent mb-6" />
          <h2 className="text-2xl font-semibold text-text-primary mb-2">
            Lade Sankey-Diagramm...
          </h2>
          <p className="text-text-secondary">Einen Moment bitte</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-sm font-medium">Portfolio</span>
            </Link>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-text-tertiary" />
              <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
                Sankey-Diagramm
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Speicher-Status */}
            <div className="text-xs text-text-tertiary flex items-center gap-1.5">
              {isSaving ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                  <span className="animate-pulse">Speichert...</span>
                </>
              ) : lastSaved ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-profit" />
                  <span>Gespeichert</span>
                </>
              ) : null}
            </div>

            {/* Reset */}
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-text-tertiary hover:text-text-secondary bg-background-elevated border border-border px-3 py-1.5 rounded-lg transition-all hover:border-border-light active:scale-95"
            >
              Zurücksetzen
            </button>
          </div>
        </div>

        {/* Info-Box – kompakt und anklickbar zum Einklappen */}
        <InfoBox />

        {/* Layout: Formular links, Diagramm rechts (auf Desktop) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
          {/* Formular */}
          <div className="xl:col-span-4 order-2 xl:order-1">
            <SankeyForm config={config} onChange={handleConfigChange} />
          </div>

          {/* Diagramm */}
          <div className="xl:col-span-8 order-1 xl:order-2">
            <div className="xl:sticky xl:top-6">
              <SankeyDiagram config={config} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// ── InfoBox (collapsible) ─────────────────────────────────────────

function InfoBox() {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full bg-background-elevated rounded-card border border-border hover:border-border-light transition-all group"
      >
        <div className="flex items-start gap-3 p-4">
          <Info className="w-5 h-5 text-text-tertiary flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-left">
            <h3 className="font-semibold text-text-primary text-sm">
              Dein persönliches Sankey-Diagramm
            </h3>
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${expanded ? 'max-h-20 opacity-100 mt-1' : 'max-h-0 opacity-0 mt-0'}`}
            >
              <p className="text-xs text-text-secondary">
                Trage dein monatliches Einkommen und deine Ausgaben ein. Die Ausgaben kannst du 
                in Kategorien (z.B. Wohnen, Freizeit) und Unterkategorien (z.B. Miete, Strom) aufteilen. 
                Das Diagramm aktualisiert sich automatisch und zeigt dir, wohin dein Geld fließt.
              </p>
            </div>
          </div>
          <span className="text-[10px] text-text-tertiary group-hover:text-text-secondary transition-colors flex-shrink-0 mt-1">
            {expanded ? 'Ausblenden' : 'Mehr'}
          </span>
        </div>
      </button>
    </div>
  );
}
