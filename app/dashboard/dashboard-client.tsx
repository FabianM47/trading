/**
 * Dashboard Client Component
 *
 * Interactive dashboard: indices, KPIs, positions table, filters, groups.
 * Live prices every minute (client polling).
 */

'use client';

import { HeaderIndices } from '@/components/ui/HeaderIndices';
import { KpiCard } from '@/components/ui/KpiCard';
import { PnlBadge, PnlText } from '@/components/ui/PnlText';
import { PriceChip, PriceText } from '@/components/ui/PriceChip';
import { useLivePrices } from '@/hooks/useLivePrices';
import {
  computePnL,
  computeTotals,
  formatCurrency,
  formatPercent,
  type Position,
  type PositionWithPrice,
} from '@/lib/portfolio/calculations';
import { cn } from '@/lib/utils';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import {
  Activity,
  DollarSign,
  Filter,
  Search,
  TrendingUp,
  X,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

interface DashboardClientProps {
  portfolio: {
    id: string;
    name: string;
  };
  positions: Position[];
  groups: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

export function DashboardClient({
  portfolio,
  positions,
  groups,
}: DashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialGroupIds = searchParams.get('groups')?.split(',').filter(Boolean) ?? [];
  const initialSearchQuery = searchParams.get('search') ?? '';
  const initialShowOpen = searchParams.get('open') === 'true';
  const initialShowClosed = searchParams.get('closed') === 'true';
  const defaultShowOpen = !initialShowOpen && !initialShowClosed ? true : initialShowOpen;

  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(initialGroupIds);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [showOpen, setShowOpen] = useState(defaultShowOpen);
  const [showClosed, setShowClosed] = useState(initialShowClosed);
  const [sorting, setSorting] = useState<SortingState>([]);

  const updateFilters = (newFilters: {
    groups?: string[];
    search?: string;
    open?: boolean;
    closed?: boolean;
  }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newFilters.groups !== undefined) {
      if (newFilters.groups.length > 0) params.set('groups', newFilters.groups.join(','));
      else params.delete('groups');
    }
    if (newFilters.search !== undefined) {
      if (newFilters.search) params.set('search', newFilters.search);
      else params.delete('search');
    }
    if (newFilters.open !== undefined) params.set('open', String(newFilters.open));
    if (newFilters.closed !== undefined) params.set('closed', String(newFilters.closed));
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const instrumentIds = positions.map((p) => p.instrumentId);
  const { prices: livePrices, isLoading: pricesLoading } = useLivePrices(instrumentIds, {
    refreshInterval: 60000,
  });

  const positionsWithPnL: PositionWithPrice[] = useMemo(() => {
    return positions.map((position) => {
      const livePrice = livePrices?.find((p) => p.instrumentId === position.instrumentId);
      const currentPrice = livePrice?.price ?? position.avgCost;
      return computePnL(position, currentPrice);
    });
  }, [positions, livePrices]);

  const filteredPositions = useMemo(() => {
    let filtered = positionsWithPnL;
    if (showOpen && !showClosed) filtered = filtered.filter((p) => !p.isClosed);
    else if (showClosed && !showOpen) filtered = filtered.filter((p) => p.isClosed);
    if (selectedGroupIds.length > 0)
      filtered = filtered.filter((p) => p.groupId && selectedGroupIds.includes(p.groupId));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.symbol.toLowerCase().includes(q) ||
          p.isin.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [positionsWithPnL, showOpen, showClosed, selectedGroupIds, searchQuery]);

  const totals = useMemo(
    () =>
      computeTotals(filteredPositions, {
        openOnly: showOpen && !showClosed,
        closedOnly: showClosed && !showOpen,
      }),
    [filteredPositions, showOpen, showClosed]
  );

  const thirtyDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }, []);
  const monthlyTotals = useMemo(
    () => computeTotals(filteredPositions, { dateFrom: thirtyDaysAgo }),
    [filteredPositions, thirtyDaysAgo]
  );

  const columns: ColumnDef<PositionWithPrice>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Instrument',
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">{p.symbol}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{p.name}</div>
              {p.groupName && (
                <span
                  className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: `${p.groupColor}20`,
                    color: p.groupColor,
                    borderColor: p.groupColor,
                    borderWidth: '1px',
                  }}
                >
                  {p.groupName}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'quantity',
        header: 'Menge',
        cell: ({ row }) => (
          <span className="font-mono">{row.original.quantity.toFixed(2)}</span>
        ),
      },
      {
        accessorKey: 'avgCost',
        header: 'Ø Einstand',
        cell: ({ row }) => <PriceText price={row.original.avgCost} />,
      },
      {
        accessorKey: 'currentPrice',
        header: 'Kurs',
        cell: ({ row }) => {
          const pos = row.original;
          return (
            <PriceChip
              price={pos.currentPrice}
              change={pos.currentPrice - pos.avgCost}
              changePercent={pos.unrealizedPnLPercent}
              size="sm"
            />
          );
        },
      },
      {
        accessorKey: 'currentValue',
        header: 'Wert',
        cell: ({ row }) => <PriceText price={row.original.currentValue} />,
      },
      {
        accessorKey: 'unrealizedPnL',
        header: 'Unrealized P&L',
        cell: ({ row }) => {
          const pos = row.original;
          return <PnlText value={pos.unrealizedPnL} percent={pos.unrealizedPnLPercent} />;
        },
      },
      {
        accessorKey: 'realizedPnL',
        header: 'Realized P&L',
        cell: ({ row }) => <PnlText value={row.original.realizedPnL} />,
      },
      {
        accessorKey: 'totalPnL',
        header: 'Total P&L',
        cell: ({ row }) => {
          const pos = row.original;
          return <PnlText value={pos.totalPnL} percent={pos.totalPnLPercent} bold />;
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredPositions,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Portfolio: {portfolio.name}</p>
        </div>
        <a
          href="/trades/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
        >
          + Neuer Trade
        </a>
      </div>

      <HeaderIndices />

      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Portfolio Performance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Monat Gewinn (nur+)"
            value={formatCurrency(monthlyTotals.profitOnlySum)}
            icon={TrendingUp}
            trend={monthlyTotals.profitOnlySum > 0 ? 'positive' : 'neutral'}
            subtitle="Letzte 30 Tage"
          />
          <KpiCard
            title="Gesamt Gewinn (nur+)"
            value={formatCurrency(totals.profitOnlySum)}
            icon={DollarSign}
            trend={totals.profitOnlySum > 0 ? 'positive' : 'neutral'}
            subtitle={`${totals.winningPositions} gewinnende Positionen`}
          />
          <KpiCard
            title="Unrealized P&L"
            value={formatCurrency(totals.unrealizedPnL)}
            icon={Activity}
            trend={
              totals.unrealizedPnL > 0
                ? 'positive'
                : totals.unrealizedPnL < 0
                  ? 'negative'
                  : 'neutral'
            }
            change={formatPercent(totals.returnPercent)}
            subtitle="Offene Positionen"
          />
          <KpiCard
            title="Total P&L"
            value={formatCurrency(totals.totalPnL)}
            icon={DollarSign}
            trend={
              totals.totalPnL > 0
                ? 'positive'
                : totals.totalPnL < 0
                  ? 'negative'
                  : 'neutral'
            }
            subtitle={`Realized: ${formatCurrency(totals.realizedPnL)}`}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Filter</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Suche nach Name, Symbol, ISIN..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                updateFilters({ search: e.target.value });
              }}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Gruppen
            </label>
            <select
              multiple
              value={selectedGroupIds}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, (o) => o.value);
                setSelectedGroupIds(selected);
                updateFilters({ groups: selected });
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowOpen(!showOpen);
                  updateFilters({ open: !showOpen });
                }}
                className={cn(
                  'flex-1 px-3 py-2 rounded-lg border font-medium transition-colors',
                  showOpen
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
                )}
              >
                Offen
              </button>
              <button
                onClick={() => {
                  setShowClosed(!showClosed);
                  updateFilters({ closed: !showClosed });
                }}
                className={cn(
                  'flex-1 px-3 py-2 rounded-lg border font-medium transition-colors',
                  showClosed
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
                )}
              >
                Geschlossen
              </button>
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSelectedGroupIds([]);
                setSearchQuery('');
                setShowOpen(true);
                setShowClosed(false);
                router.replace('/dashboard');
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
            >
              <X className="h-4 w-4" />
              Filter zurücksetzen
            </button>
          </div>
        </div>
        {(selectedGroupIds.length > 0 || searchQuery) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedGroupIds.map((groupId) => {
              const g = groups.find((x) => x.id === groupId);
              return g ? (
                <span
                  key={groupId}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                >
                  {g.name}
                  <button
                    onClick={() => {
                      const next = selectedGroupIds.filter((id) => id !== groupId);
                      setSelectedGroupIds(next);
                      updateFilters({ groups: next });
                    }}
                    className="hover:text-blue-900 dark:hover:text-blue-300"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ) : null;
            })}
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700">
                Suche: &quot;{searchQuery}&quot;
                <button
                  onClick={() => {
                    setSearchQuery('');
                    updateFilters({ search: '' });
                  }}
                  className="hover:text-gray-900 dark:hover:text-gray-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Positionen ({filteredPositions.length})
          </h3>
        </div>
        {pricesLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Lade aktuelle Kurse...</p>
          </div>
        ) : filteredPositions.length === 0 ? (
          <div className="p-8 text-center text-gray-600 dark:text-gray-400">
            <p>Keine Positionen gefunden.</p>
            <p className="text-sm mt-2">Passe deine Filter an oder füge einen Trade hinzu.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-2">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getIsSorted() && (
                            <span>{header.column.getIsSorted() === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Investiert</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(totals.totalInvested)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Aktueller Wert</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(totals.currentValue)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Gesamt P&L</p>
            <PnlText value={totals.totalPnL} size="lg" bold />
            <p className="text-sm mt-1">
              <PnlBadge value={0} percent={totals.returnPercent} />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
