'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  ArrowLeft,
  RefreshCw,
  Users,
  Newspaper,
  Settings,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import RoleGate from '@/components/RoleGate';
import type { AdminUserInfo } from '@/app/api/admin/users/route';
import type { AdminNewsStats } from '@/app/api/admin/news/route';
import type { NewsSourcesResponse } from '@/types/news';

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json();
});

type Tab = 'news' | 'users';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('news');
  const [isRefreshing, setIsRefreshing] = useState(false);

  return (
    <RoleGate role="admin">
      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <ArrowLeft size={16} />
              Zurueck
            </Link>
            <div className="flex items-center gap-2">
              <Settings size={20} className="text-zinc-400" />
              <h1 className="text-lg font-bold text-zinc-100">Admin-Einstellungen</h1>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-zinc-900/50 rounded-lg p-1 border border-zinc-800">
          <button
            onClick={() => setActiveTab('news')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${
              activeTab === 'news'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Newspaper size={16} />
            News
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${
              activeTab === 'users'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users size={16} />
            Benutzer
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'news' && (
          <NewsTab
            isRefreshing={isRefreshing}
            setIsRefreshing={setIsRefreshing}
          />
        )}
        {activeTab === 'users' && <UsersTab />}
      </div>
    </RoleGate>
  );
}

/* ================================================
   News Tab
   ================================================ */

function NewsTab({
  isRefreshing,
  setIsRefreshing,
}: {
  isRefreshing: boolean;
  setIsRefreshing: (v: boolean) => void;
}) {
  const { data: newsData, isLoading: newsLoading, mutate: mutateNews } = useSWR<{ stats: AdminNewsStats }>(
    '/api/admin/news',
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: sourcesData, isLoading: sourcesLoading, mutate: mutateSources } = useSWR<NewsSourcesResponse>(
    '/api/news/sources',
    fetcher,
    { revalidateOnFocus: false }
  );

  const stats = newsData?.stats;
  const allSources = [
    ...(sourcesData?.builtin || []),
    ...(sourcesData?.custom || []),
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/news/refresh', { method: 'POST' });
      if (res.status === 429) {
        alert('Zu viele Anfragen. Maximal 3 Aktualisierungen pro Stunde.');
        return;
      }
      if (!res.ok) {
        alert('Fehler beim Aktualisieren der News.');
        return;
      }
      await mutateNews();
    } catch {
      alert('Fehler beim Aktualisieren der News.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleToggleSource = async (id: string, enabled: boolean) => {
    try {
      const res = await fetch('/api/news/sources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isEnabled: enabled }),
      });
      if (!res.ok) {
        alert('Fehler beim Aktualisieren der Quelle.');
        return;
      }
      mutateSources();
    } catch {
      alert('Fehler beim Aktualisieren der Quelle.');
    }
  };

  if (newsLoading || sourcesLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse h-20 rounded-xl border border-zinc-800 bg-zinc-900/50" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Aktualisierung */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-zinc-100">Aktualisierung</h2>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-zinc-200 transition-colors disabled:opacity-50"
          >
            {isRefreshing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            {isRefreshing ? 'Aktualisiert...' : 'Jetzt aktualisieren'}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Artikel gesamt" value={stats?.totalArticles ?? 0} />
          <StatCard label="Analysiert" value={stats?.analyzedArticles ?? 0} />
          <StatCard
            label="Nicht analysiert"
            value={stats?.unanalyzedArticles ?? 0}
            highlight={stats?.unanalyzedArticles ? 'warning' : undefined}
          />
          <StatCard
            label="Letzter Brief"
            value={stats?.lastBriefDate ? formatDate(stats.lastBriefDate) : 'Nie'}
            isText
          />
        </div>

        {stats?.lastFetchedAt && (
          <p className="text-xs text-zinc-500 mt-4">
            Letzter Fetch: {formatDateTime(stats.lastFetchedAt)}
            {stats.lastAnalyzedAt && (
              <> &middot; Letzte Analyse: {formatDateTime(stats.lastAnalyzedAt)}</>
            )}
          </p>
        )}
      </div>

      {/* Quellen */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-zinc-100">
            Quellen ({stats?.enabledSources ?? 0}/{stats?.totalSources ?? 0} aktiv)
          </h2>
          <Link
            href="/news/sources"
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Verwalten
            <ExternalLink size={12} />
          </Link>
        </div>

        <div className="space-y-2">
          {allSources.map((source) => (
            <div
              key={source.id}
              className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${
                    source.isEnabled ? 'bg-green-500' : 'bg-zinc-600'
                  }`}
                />
                <div>
                  <p className="text-sm text-zinc-200">{source.name}</p>
                  <p className="text-xs text-zinc-500">
                    {source.providerType}
                    {source.isBuiltin && ' · Eingebaut'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleToggleSource(source.id, !source.isEnabled)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  source.isEnabled ? 'bg-green-600' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    source.isEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Artikel pro Quelle */}
      {stats?.articlesBySource && stats.articlesBySource.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-base font-semibold text-zinc-100 mb-4">Artikel pro Quelle</h2>
          <div className="space-y-2">
            {stats.articlesBySource.map((item) => {
              const maxCount = stats.articlesBySource[0]?.count || 1;
              const widthPercent = Math.max((item.count / maxCount) * 100, 4);
              return (
                <div key={item.sourceName} className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400 w-28 truncate shrink-0">{item.sourceName}</span>
                  <div className="flex-1 h-5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600/60 rounded-full transition-all"
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-400 w-10 text-right">{item.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================
   Users Tab
   ================================================ */

function UsersTab() {
  const { data, isLoading } = useSWR<{ users: AdminUserInfo[] }>(
    '/api/admin/users',
    fetcher,
    { revalidateOnFocus: false }
  );

  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const users = data?.users || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse h-20 rounded-xl border border-zinc-800 bg-zinc-900/50" />
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <Users size={40} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm">Keine Benutzer gefunden.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
        <StatCard label="Benutzer gesamt" value={users.length} />
        <StatCard label="Admins" value={users.filter((u) => u.roles.includes('admin')).length} />
        <StatCard label="Trader" value={users.filter((u) => u.roles.includes('trading') || u.roles.includes('admin')).length} />
      </div>

      {/* User List */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        {users.map((user, idx) => {
          const isExpanded = expandedUser === user.id;
          return (
            <div
              key={user.id}
              className={idx < users.length - 1 ? 'border-b border-zinc-800/50' : ''}
            >
              {/* User Row */}
              <button
                onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-zinc-800/30 transition-colors text-left"
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm text-zinc-400 font-medium">
                      {(user.username || user.name || user.email || '?')[0].toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-100 truncate">
                      {user.username || user.name || user.email || user.id.slice(0, 8)}
                    </p>
                    {user.roles.map((role) => (
                      <span
                        key={role}
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          role === 'admin'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                  {user.email && user.username && (
                    <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                  )}
                </div>

                {/* Trade Stats (compact) */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-zinc-500">Offen</p>
                    <p className="text-sm text-zinc-200 font-medium">{user.openTrades}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-500">Geschlossen</p>
                    <p className="text-sm text-zinc-200 font-medium">{user.closedTrades}</p>
                  </div>
                  <svg
                    className={`w-4 h-4 text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 bg-zinc-800/20">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <DetailCard label="User ID" value={user.id.slice(0, 12) + '...'} mono />
                    <DetailCard
                      label="Registriert"
                      value={user.createdAt ? formatDate(user.createdAt) : '-'}
                    />
                    <DetailCard
                      label="Letzter Login"
                      value={user.lastSignInAt ? formatDateTime(user.lastSignInAt) : 'Nie'}
                    />
                    <DetailCard
                      label="Investiert"
                      value={`${user.totalInvested.toLocaleString('de-DE', { minimumFractionDigits: 2 })} EUR`}
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                    <DetailCard label="Offene Trades" value={String(user.openTrades)} />
                    <DetailCard label="Geschlossene Trades" value={String(user.closedTrades)} />
                    <DetailCard
                      label="Realisierter P/L"
                      value={`${user.totalRealizedPnL >= 0 ? '+' : ''}${user.totalRealizedPnL.toLocaleString('de-DE', { minimumFractionDigits: 2 })} EUR`}
                      highlight={user.totalRealizedPnL > 0 ? 'profit' : user.totalRealizedPnL < 0 ? 'loss' : undefined}
                    />
                    <DetailCard label="Rollen" value={user.roles.join(', ') || 'Keine'} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================
   Shared Components
   ================================================ */

function StatCard({
  label,
  value,
  highlight,
  isText,
}: {
  label: string;
  value: number | string;
  highlight?: 'warning' | 'profit' | 'loss';
  isText?: boolean;
}) {
  const valueColor =
    highlight === 'warning'
      ? 'text-amber-400'
      : highlight === 'profit'
        ? 'text-green-400'
        : highlight === 'loss'
          ? 'text-red-400'
          : 'text-zinc-100';

  return (
    <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-800/50">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className={`text-lg font-semibold ${valueColor}`}>
        {isText ? value : typeof value === 'number' ? value.toLocaleString('de-DE') : value}
      </p>
    </div>
  );
}

function DetailCard({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: 'profit' | 'loss';
}) {
  const valueColor =
    highlight === 'profit'
      ? 'text-green-400'
      : highlight === 'loss'
        ? 'text-red-400'
        : 'text-zinc-200';

  return (
    <div className="bg-zinc-900/50 rounded-lg p-2.5">
      <p className="text-[10px] text-zinc-500 mb-0.5">{label}</p>
      <p className={`text-xs ${valueColor} ${mono ? 'font-mono' : ''} truncate`}>{value}</p>
    </div>
  );
}

/* ================================================
   Helpers
   ================================================ */

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}
