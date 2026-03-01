'use client';

import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Sankey, Tooltip, ResponsiveContainer } from 'recharts';
import { GitBranch, Download, ZoomIn, ZoomOut, RotateCcw, Maximize2, ChevronDown, ChevronUp } from 'lucide-react';
import type { SankeyConfig } from '@/types/sankey';

interface SankeyDiagramProps {
  config: SankeyConfig;
}

// Farb-Palette
const INCOME_COLOR = '#22c55e';
const TOTAL_COLOR = '#3b82f6';
const SAVINGS_COLOR = '#10b981';
const CATEGORY_COLORS = [
  '#a855f7', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899',
  '#14b8a6', '#f97316', '#8b5cf6', '#6366f1', '#84cc16',
  '#e879f9', '#fb7185', '#38bdf8', '#facc15', '#4ade80',
  '#c084fc', '#f472b6', '#22d3ee', '#a3e635', '#fbbf24',
];
const SAVINGS_CATEGORY_COLORS = [
  '#34d399', '#059669', '#10b981', '#047857', '#6ee7b7',
  '#0d9488', '#2dd4bf', '#065f46', '#a7f3d0', '#15803d',
];
const SUB_COLORS = [
  '#c084fc', '#fbbf24', '#f87171', '#22d3ee', '#f472b6',
  '#2dd4bf', '#fb923c', '#a78bfa', '#818cf8', '#a3e635',
  '#fca5a5', '#67e8f9', '#d8b4fe', '#fde68a', '#86efac',
  '#f9a8d4', '#fdba74', '#93c5fd', '#bef264', '#fda4af',
];
const SAVINGS_SUB_COLORS = [
  '#6ee7b7', '#34d399', '#a7f3d0', '#10b981', '#2dd4bf',
  '#5eead4', '#99f6e4', '#059669', '#d1fae5', '#0d9488',
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function buildSankeyData(config: SankeyConfig) {
  const nodes: { name: string; color: string }[] = [];
  const links: { source: number; target: number; value: number }[] = [];

  // 1) Einkommen-Knoten (links)
  const incomeIndices: number[] = [];
  config.incomes.forEach((income) => {
    if (income.amount <= 0) return;
    incomeIndices.push(nodes.length);
    nodes.push({ name: income.name, color: INCOME_COLOR });
  });

  if (incomeIndices.length === 0) return { nodes: [], links: [] };

  // 2) Gesamt-Einkommen Knoten (Mitte-links)
  const totalIncomeIdx = nodes.length;
  const totalIncome = config.incomes.reduce((s, i) => s + (i.amount > 0 ? i.amount : 0), 0);
  nodes.push({ name: 'Einkommen gesamt', color: TOTAL_COLOR });

  // Links: Einzelne Einkommen → Gesamt
  let incomeNodeCounter = 0;
  config.incomes.forEach((income) => {
    if (income.amount <= 0) return;
    links.push({
      source: incomeIndices[incomeNodeCounter],
      target: totalIncomeIdx,
      value: income.amount,
    });
    incomeNodeCounter++;
  });

  // 3) Ausgaben-Kategorien (Mitte-rechts)
  const categoryIndices: number[] = [];
  config.expenses.forEach((cat, i) => {
    if (cat.amount <= 0) return;
    categoryIndices.push(nodes.length);
    nodes.push({ name: cat.name, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] });
  });

  // Links: Gesamt → Ausgaben-Kategorien
  let catCounter = 0;
  config.expenses.forEach((cat) => {
    if (cat.amount <= 0) return;
    links.push({
      source: totalIncomeIdx,
      target: categoryIndices[catCounter],
      value: cat.amount,
    });
    catCounter++;
  });

  // 4) Ausgaben-Unterkategorien (rechts)
  catCounter = 0;
  config.expenses.forEach((cat, catIdx) => {
    if (cat.amount <= 0) return;
    const catNodeIdx = categoryIndices[catCounter];

    if (cat.subItems.length > 0) {
      const subTotal = cat.subItems.reduce((s, sub) => s + (sub.amount > 0 ? sub.amount : 0), 0);

      cat.subItems.forEach((sub, subIdx) => {
        if (sub.amount <= 0) return;
        const subNodeIdx = nodes.length;
        nodes.push({ name: sub.name, color: SUB_COLORS[(catIdx * 3 + subIdx) % SUB_COLORS.length] });
        links.push({
          source: catNodeIdx,
          target: subNodeIdx,
          value: sub.amount,
        });
      });

      const rest = cat.amount - subTotal;
      if (rest > 0.5) {
        const restIdx = nodes.length;
        nodes.push({ name: `${cat.name} (Sonstiges)`, color: '#64748b' });
        links.push({
          source: catNodeIdx,
          target: restIdx,
          value: Math.round(rest * 100) / 100,
        });
      }
    }

    catCounter++;
  });

  // 5) Sparen-Kategorien (Mitte-rechts, grün)
  const savings = config.savings || [];
  const savingsIndices: number[] = [];
  savings.forEach((sav, i) => {
    if (sav.amount <= 0) return;
    savingsIndices.push(nodes.length);
    nodes.push({ name: sav.name, color: SAVINGS_CATEGORY_COLORS[i % SAVINGS_CATEGORY_COLORS.length] });
  });

  // Links: Gesamt → Spar-Kategorien
  let savCounter = 0;
  savings.forEach((sav) => {
    if (sav.amount <= 0) return;
    links.push({
      source: totalIncomeIdx,
      target: savingsIndices[savCounter],
      value: sav.amount,
    });
    savCounter++;
  });

  // 6) Sparen-Unterkategorien (rechts)
  savCounter = 0;
  savings.forEach((sav, savIdx) => {
    if (sav.amount <= 0) return;
    const savNodeIdx = savingsIndices[savCounter];

    if (sav.subItems.length > 0) {
      const subTotal = sav.subItems.reduce((s, sub) => s + (sub.amount > 0 ? sub.amount : 0), 0);

      sav.subItems.forEach((sub, subIdx) => {
        if (sub.amount <= 0) return;
        const subNodeIdx = nodes.length;
        nodes.push({ name: sub.name, color: SAVINGS_SUB_COLORS[(savIdx * 3 + subIdx) % SAVINGS_SUB_COLORS.length] });
        links.push({
          source: savNodeIdx,
          target: subNodeIdx,
          value: sub.amount,
        });
      });

      const rest = sav.amount - subTotal;
      if (rest > 0.5) {
        const restIdx = nodes.length;
        nodes.push({ name: `${sav.name} (Sonstiges)`, color: '#64748b' });
        links.push({
          source: savNodeIdx,
          target: restIdx,
          value: Math.round(rest * 100) / 100,
        });
      }
    }

    savCounter++;
  });

  // 7) Überschuss / Defizit (nicht zugewiesenes Geld)
  const totalExpenses = config.expenses.reduce((s, c) => s + (c.amount > 0 ? c.amount : 0), 0);
  const totalSavings = savings.reduce((s, c) => s + (c.amount > 0 ? c.amount : 0), 0);
  const diff = totalIncome - totalExpenses - totalSavings;

  if (diff > 0.5) {
    const sparIdx = nodes.length;
    nodes.push({ name: 'Nicht zugewiesen', color: '#64748b' });
    links.push({
      source: totalIncomeIdx,
      target: sparIdx,
      value: Math.round(diff * 100) / 100,
    });
  }

  return { nodes, links };
}

// Custom Node
function CustomNode({ x, y, width, height, payload, containerWidth }: {
  x: number; y: number; width: number; height: number;
  index: number; payload: { name: string; color?: string; value?: number };
  containerWidth: number;
}) {
  if (height < 1) return null;

  // Dynamische isLeftSide-Erkennung basierend auf Mitte des Containers
  const midPoint = containerWidth / 2;
  const isLeftSide = x + width / 2 < midPoint * 0.45;

  // Adaptive Schriftgröße: kleiner wenn viele Knoten / wenig Platz
  const fontSize = height < 14 ? 10 : 11;
  const showLabel = height > 5;

  // Label zusammenbauen – bei kleiner Breite nur Name, sonst mit Betrag
  const compactMode = containerWidth < 700;
  const label = compactMode
    ? payload.name
    : payload.value
      ? `${payload.name} (${formatCurrency(payload.value)})`
      : payload.name;

  // Maximale Label-Länge basierend auf verfügbarem Platz
  const maxChars = compactMode ? 16 : 28;
  const truncatedLabel = label.length > maxChars ? label.slice(0, maxChars - 1) + '…' : label;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={payload.color || '#64748b'}
        rx={3}
        ry={3}
        opacity={0.9}
      />
      {showLabel && (
        <text
          x={isLeftSide ? x - 8 : x + width + 8}
          y={y + height / 2}
          textAnchor={isLeftSide ? 'end' : 'start'}
          dominantBaseline="middle"
          fill="#e0e0e0"
          fontSize={fontSize}
          fontWeight={500}
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.6)' }}
        >
          {truncatedLabel}
        </text>
      )}
    </g>
  );
}

// Custom Link
function CustomLink({
  sourceX, targetX, sourceY, targetY,
  sourceControlX, targetControlX, linkWidth, payload,
}: {
  sourceX: number; targetX: number; sourceY: number; targetY: number;
  sourceControlX: number; targetControlX: number;
  linkWidth: number; index: number;
  payload: { source: { color?: string }; target: { color?: string }; value: number };
}) {
  const sourceColor = payload.source?.color || '#64748b';
  const targetColor = payload.target?.color || sourceColor;
  const gradientId = `link-${sourceX}-${sourceY}-${targetX}-${targetY}`;

  return (
    <g>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={sourceColor} stopOpacity={0.4} />
          <stop offset="100%" stopColor={targetColor} stopOpacity={0.25} />
        </linearGradient>
      </defs>
      <path
        d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={Math.max(linkWidth, 1)}
        strokeOpacity={1}
        className="transition-all duration-200 hover:[stroke-opacity:0.8]"
      />
    </g>
  );
}

// Custom Tooltip
function CustomTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  if (data.source && data.target) {
    return (
      <div className="bg-background-elevated border border-border-light rounded-xl p-3.5 shadow-2xl backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.source.color || '#64748b' }} />
          <span className="text-xs text-text-secondary">{data.source.name}</span>
          <span className="text-text-tertiary text-xs">→</span>
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.target.color || '#64748b' }} />
          <span className="text-xs text-text-secondary">{data.target.name}</span>
        </div>
        <p className="text-lg font-bold text-white tabular-nums">
          {formatCurrency(data.value)}
        </p>
      </div>
    );
  }

  if (data.name) {
    return (
      <div className="bg-background-elevated border border-border-light rounded-xl p-3.5 shadow-2xl backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color || '#64748b' }} />
          <p className="text-sm font-semibold text-text-primary">{data.name}</p>
        </div>
        {data.value !== undefined && (
          <p className="text-lg font-bold text-white tabular-nums">
            {formatCurrency(data.value)}
          </p>
        )}
      </div>
    );
  }

  return null;
}

export default function SankeyDiagram({ config }: SankeyDiagramProps) {
  const sankeyData = useMemo(() => buildSankeyData(config), [config]);
  const containerRef = useRef<HTMLDivElement>(null);
  const diagramRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(z + 0.15, 2)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(z - 0.15, 0.5)), []);
  const handleZoomReset = useCallback(() => setZoom(1), []);

  const handleExportSVG = useCallback(() => {
    const svgEl = diagramRef.current?.querySelector('svg');
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgEl);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sankey-diagramm.svg';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  if (sankeyData.nodes.length === 0 || sankeyData.links.length === 0) {
    return (
      <div className="bg-background-card rounded-card border border-border shadow-card overflow-hidden">
        <div className="p-12 sm:p-16 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-background-elevated border border-border flex items-center justify-center">
              <GitBranch className="w-10 h-10 text-text-tertiary" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-text-primary mb-2">Noch keine Daten</h3>
          <p className="text-text-secondary text-sm max-w-md mx-auto">
            Trage links dein Einkommen und deine Ausgaben ein, um dein persönliches 
            Sankey-Diagramm zu erstellen. Es aktualisiert sich in Echtzeit.
          </p>
          <div className="mt-8 flex items-center justify-center gap-6 text-text-tertiary text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
              Einkommen
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#a855f7]" />
              Ausgaben
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#10b981]" />
              Sparen
            </div>
          </div>
        </div>
      </div>
    );
  }

  const diagramHeight = Math.max(500, sankeyData.nodes.length * 44);
  const nodePadding = sankeyData.nodes.length > 12 ? 28 : sankeyData.nodes.length > 8 ? 24 : 20;
  const sideMargin = containerWidth < 600 ? 120 : containerWidth < 900 ? 150 : 180;
  const isMobile = containerWidth < 480;
  const minDiagramWidth = isMobile ? 640 : containerWidth;

  const fullscreenClasses = isFullscreen
    ? 'fixed inset-0 z-50 bg-background flex flex-col'
    : 'bg-background-card rounded-card border border-border shadow-card overflow-hidden';

  return (
    <div className={fullscreenClasses}>
      {/* Summary Bar – collapsible */}
      <div className="bg-background-elevated border-b border-border">
        <button
          type="button"
          onClick={() => setSummaryExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-4 sm:px-6 py-3 hover:bg-background-card/30 transition-colors"
          aria-expanded={summaryExpanded}
          aria-label="Zusammenfassung ein-/ausblenden"
        >
          <span className="text-[10px] text-text-tertiary uppercase tracking-wider font-medium">Zusammenfassung</span>
          {summaryExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-text-tertiary" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" />
          )}
        </button>
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${summaryExpanded ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <SummaryBar config={config} />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-b border-border/50 bg-background-card/50">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-background-elevated disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Verkleinern"
            aria-label="Verkleinern"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[10px] text-text-tertiary tabular-nums w-10 text-center font-medium">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= 2}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-background-elevated disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Vergrößern"
            aria-label="Vergrößern"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomReset}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-background-elevated transition-all ml-0.5"
            title="Zoom zurücksetzen"
            aria-label="Zoom zurücksetzen"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleExportSVG}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-background-elevated transition-all"
            title="Als SVG exportieren"
            aria-label="Als SVG exportieren"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-background-elevated transition-all"
            title={isFullscreen ? 'Vollbild verlassen' : 'Vollbild'}
            aria-label={isFullscreen ? 'Vollbild verlassen' : 'Vollbild'}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile scroll hint */}
      {isMobile && (
        <div className="px-4 pt-3 flex items-center gap-1.5 text-[10px] text-text-tertiary">
          <span>←</span>
          <span>Horizontal scrollen für vollständiges Diagramm</span>
          <span>→</span>
        </div>
      )}

      <div className={`p-3 sm:p-6 ${isFullscreen ? 'flex-1 overflow-auto' : ''}`}>
        <div
          ref={containerRef}
          className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0"
          style={{ width: '100%' }}
        >
          <div
            ref={diagramRef}
            style={{
              width: minDiagramWidth * zoom,
              height: diagramHeight * zoom,
              minWidth: minDiagramWidth * zoom,
              transformOrigin: 'top left',
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <Sankey
                data={sankeyData}
                nodeWidth={isMobile ? 10 : 12}
                nodePadding={nodePadding}
                linkCurvature={0.45}
                iterations={128}
                sort={false}
                node={(props: any) => <CustomNode {...props} containerWidth={minDiagramWidth * zoom} />}
                link={(props: any) => <CustomLink {...props} />}
                margin={{ top: 16, right: (isMobile ? 130 : sideMargin) + 20, bottom: 16, left: isMobile ? 130 : sideMargin }}
              >
                <Tooltip content={<CustomTooltip />} />
              </Sankey>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <LegendItem color={INCOME_COLOR} label="Einkommen" />
            <LegendItem color={TOTAL_COLOR} label="Gesamt" />
            {config.expenses.filter(e => e.amount > 0).map((cat, i) => (
              <LegendItem
                key={cat.id}
                color={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                label={cat.name || `Kategorie ${i + 1}`}
              />
            ))}
            {(config.savings || []).filter(s => s.amount > 0).map((sav, i) => (
              <LegendItem
                key={sav.id}
                color={SAVINGS_CATEGORY_COLORS[i % SAVINGS_CATEGORY_COLORS.length]}
                label={sav.name || `Sparen ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Fullscreen: ESC-Hinweis */}
      {isFullscreen && (
        <div className="absolute top-4 right-4 text-[10px] text-text-tertiary bg-background-elevated/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-border animate-pulse">
          ESC oder Klick zum Verlassen
        </div>
      )}
    </div>
  );
}

// ── Legend Item ────────────────────────────────────────────────────

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-text-tertiary">
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="truncate max-w-[100px]">{label}</span>
    </div>
  );
}

// ── Summary Bar ───────────────────────────────────────────────────

function SummaryBar({ config }: { config: SankeyConfig }) {
  const totalIncome = config.incomes.reduce((s, i) => s + Math.max(i.amount, 0), 0);
  const totalExpenses = config.expenses.reduce((s, c) => s + Math.max(c.amount, 0), 0);
  const totalSavings = (config.savings || []).reduce((s, c) => s + Math.max(c.amount, 0), 0);
  const remaining = totalIncome - totalExpenses - totalSavings;
  const sparquote = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

  // Prozentanteile für die Verteilungs-Bar
  const expPct = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;
  const savPct = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;
  const remPct = totalIncome > 0 ? Math.max(remaining, 0) / totalIncome * 100 : 0;
  const overBudget = remaining < 0;

  return (
    <div className="px-4 sm:px-6 py-4">
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-5 items-center">
        <div>
          <div className="text-[10px] text-text-tertiary uppercase tracking-wider font-medium">Einkommen</div>
          <div className="text-base sm:text-lg font-bold text-profit tabular-nums">{formatCurrency(totalIncome)}</div>
        </div>
        <div className="text-text-tertiary text-lg hidden sm:block">−</div>
        <div>
          <div className="text-[10px] text-text-tertiary uppercase tracking-wider font-medium">Ausgaben</div>
          <div className="text-base sm:text-lg font-bold text-loss tabular-nums">{formatCurrency(totalExpenses)}</div>
        </div>
        <div className="text-text-tertiary text-lg hidden sm:block">−</div>
        <div>
          <div className="text-[10px] text-text-tertiary uppercase tracking-wider font-medium">Sparen</div>
          <div className="text-base sm:text-lg font-bold tabular-nums" style={{ color: SAVINGS_COLOR }}>{formatCurrency(totalSavings)}</div>
        </div>
        <div className="text-text-tertiary text-lg hidden sm:block">=</div>
        <div>
          <div className="text-[10px] text-text-tertiary uppercase tracking-wider font-medium">
            {remaining >= 0 ? 'Rest' : 'Defizit'}
          </div>
          <div className={`text-base sm:text-lg font-bold tabular-nums ${remaining >= 0 ? 'text-text-secondary' : 'text-loss'}`}>
            {formatCurrency(remaining)}
          </div>
        </div>
        <div className="col-span-2 sm:col-span-1 sm:ml-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
          <div className="text-[10px] text-text-tertiary uppercase tracking-wider font-medium">Sparquote</div>
          <div className={`text-base sm:text-lg font-bold tabular-nums ${sparquote > 0 ? 'text-profit' : 'text-text-secondary'}`}>
            {sparquote.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Budget-Verteilungs-Bar */}
      {totalIncome > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] text-text-tertiary uppercase tracking-wider font-medium">Verteilung</span>
            {overBudget && (
              <span className="text-[10px] text-loss font-medium animate-pulse">⚠ Budget überschritten</span>
            )}
          </div>
          <div className="h-2.5 w-full bg-background rounded-full overflow-hidden flex" role="progressbar" aria-label="Budgetverteilung">
            <div
              className="h-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(expPct, 100)}%`, backgroundColor: '#ff1744' }}
              title={`Ausgaben: ${expPct.toFixed(1)}%`}
            />
            <div
              className="h-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(savPct, 100 - Math.min(expPct, 100))}%`, backgroundColor: SAVINGS_COLOR }}
              title={`Sparen: ${savPct.toFixed(1)}%`}
            />
            {!overBudget && (
              <div
                className="h-full transition-all duration-500 ease-out"
                style={{ width: `${remPct}%`, backgroundColor: '#333333' }}
                title={`Rest: ${remPct.toFixed(1)}%`}
              />
            )}
          </div>
          <div className="flex items-center justify-between mt-1.5 text-[9px] text-text-tertiary">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-loss" />
                Ausgaben {expPct.toFixed(0)}%
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SAVINGS_COLOR }} />
                Sparen {savPct.toFixed(0)}%
              </span>
              {!overBudget && (
                <span className="flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-border-light" />
                  Rest {remPct.toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
