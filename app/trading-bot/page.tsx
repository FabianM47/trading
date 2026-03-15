'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  ArrowLeft,
  Bot,
  LayoutDashboard,
  FileText,
  Eye,
  LineChart,
  Settings,
} from 'lucide-react';
import RoleGate from '@/components/RoleGate';
import BotDashboardTab from '@/components/trading-bot/BotDashboardTab';
import BotStrategiesTab from '@/components/trading-bot/BotStrategiesTab';
import BotWatchlistTab from '@/components/trading-bot/BotWatchlistTab';
import BotTradesTab from '@/components/trading-bot/BotTradesTab';
import BotSettingsTab from '@/components/trading-bot/BotSettingsTab';
import type {
  BotTab,
  BotStrategy,
  BotUserConfig,
  BotTrade,
  BotWatchlistItem,
  BotStats,
  BotNotificationConfig,
} from '@/types/trading-bot';

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  });

const TABS: { id: BotTab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Uebersicht', icon: LayoutDashboard },
  { id: 'strategies', label: 'Strategien', icon: FileText },
  { id: 'watchlist', label: 'Watchlist', icon: Eye },
  { id: 'trades', label: 'Trades', icon: LineChart },
  { id: 'settings', label: 'Einstellungen', icon: Settings },
];

export default function TradingBotPage() {
  const [activeTab, setActiveTab] = useState<BotTab>('dashboard');

  // ── Data Fetching ──
  const {
    data: configData,
    mutate: mutateConfig,
  } = useSWR<{ config: BotUserConfig | null }>('/api/trading-bot/config', fetcher, {
    revalidateOnFocus: false,
  });

  const {
    data: statsData,
    isLoading: statsLoading,
  } = useSWR<{ stats: BotStats }>('/api/trading-bot/stats', fetcher, {
    revalidateOnFocus: false,
  });

  const {
    data: strategiesData,
    isLoading: strategiesLoading,
    mutate: mutateStrategies,
  } = useSWR<{ strategies: BotStrategy[] }>('/api/trading-bot/strategies', fetcher, {
    revalidateOnFocus: false,
  });

  const {
    data: watchlistData,
    isLoading: watchlistLoading,
    mutate: mutateWatchlist,
  } = useSWR<{ watchlist: BotWatchlistItem[] }>('/api/trading-bot/watchlist', fetcher, {
    revalidateOnFocus: false,
  });

  const {
    data: tradesData,
    isLoading: tradesLoading,
    mutate: mutateTrades,
  } = useSWR<{ trades: BotTrade[] }>('/api/trading-bot/trades', fetcher, {
    revalidateOnFocus: false,
  });

  const {
    data: notificationsData,
    mutate: mutateNotifications,
  } = useSWR<{ notifications: BotNotificationConfig | null }>(
    '/api/trading-bot/notifications',
    fetcher,
    { revalidateOnFocus: false }
  );

  const config = configData?.config || null;
  const stats = statsData?.stats || null;
  const strategies = strategiesData?.strategies || [];
  const watchlist = watchlistData?.watchlist || [];
  const trades = tradesData?.trades || [];
  const notifications = notificationsData?.notifications || null;

  // ── API Handlers ──

  const apiCall = useCallback(async (url: string, method: string, body?: object) => {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Request failed: ${res.status}`);
    }
    return res.json();
  }, []);

  // Config
  const handleInitConfig = useCallback(async () => {
    await apiCall('/api/trading-bot/config', 'POST');
    mutateConfig();
  }, [apiCall, mutateConfig]);

  const handleSaveConfig = useCallback(async (updates: Partial<BotUserConfig>) => {
    await apiCall('/api/trading-bot/config', 'PUT', updates);
    mutateConfig();
  }, [apiCall, mutateConfig]);

  // Portfolio toggle
  const handleTogglePortfolio = useCallback(async (enabled: boolean) => {
    await apiCall('/api/trading-bot/trades/sync', 'POST', {
      action: enabled ? 'enable' : 'disable',
    });
    mutateConfig();
  }, [apiCall, mutateConfig]);

  // Strategies
  const handleSaveStrategy = useCallback(async (data: { name: string; slug: string; description?: string; markdownContent: string; isActive?: boolean }) => {
    await apiCall('/api/trading-bot/strategies', 'POST', data);
    mutateStrategies();
  }, [apiCall, mutateStrategies]);

  const handleUpdateStrategy = useCallback(async (data: { id: string; name?: string; slug?: string; description?: string; markdownContent?: string; isActive?: boolean }) => {
    await apiCall('/api/trading-bot/strategies', 'PUT', data);
    mutateStrategies();
  }, [apiCall, mutateStrategies]);

  const handleDeleteStrategy = useCallback(async (id: string) => {
    await apiCall(`/api/trading-bot/strategies?id=${id}`, 'DELETE');
    mutateStrategies();
  }, [apiCall, mutateStrategies]);

  const handleActivateStrategy = useCallback(async (id: string) => {
    await apiCall('/api/trading-bot/strategies', 'PUT', { id, isActive: true });
    mutateStrategies();
    // Also update config's active strategy
    await apiCall('/api/trading-bot/config', 'PUT', { activeStrategyId: id });
    mutateConfig();
  }, [apiCall, mutateStrategies, mutateConfig]);

  // Watchlist
  const handleAddWatchlist = useCallback(async (item: { isin: string; ticker?: string; name: string; currency?: 'EUR' | 'USD' }) => {
    await apiCall('/api/trading-bot/watchlist', 'POST', item);
    mutateWatchlist();
  }, [apiCall, mutateWatchlist]);

  const handleUpdateWatchlist = useCallback(async (data: { id: string; isActive?: boolean; notes?: string }) => {
    await apiCall('/api/trading-bot/watchlist', 'PUT', data);
    mutateWatchlist();
  }, [apiCall, mutateWatchlist]);

  const handleRemoveWatchlist = useCallback(async (id: string) => {
    await apiCall(`/api/trading-bot/watchlist?id=${id}`, 'DELETE');
    mutateWatchlist();
  }, [apiCall, mutateWatchlist]);

  // Trades
  const handleCreateTrade = useCallback(async (data: object) => {
    await apiCall('/api/trading-bot/trades', 'POST', data);
    mutateTrades();
  }, [apiCall, mutateTrades]);

  const handleCloseTrade = useCallback(async (data: { id: string; sellPrice: number; sellTotal: number; realizedPnL: number; exitReason?: string }) => {
    await apiCall('/api/trading-bot/trades', 'PUT', {
      id: data.id,
      isClosed: true,
      closedAt: new Date().toISOString(),
      sellPrice: data.sellPrice,
      sellTotal: data.sellTotal,
      realizedPnL: data.realizedPnL,
      exitReason: data.exitReason,
    });
    mutateTrades();
  }, [apiCall, mutateTrades]);

  const handleDeleteTrade = useCallback(async (id: string) => {
    await apiCall(`/api/trading-bot/trades?id=${id}`, 'DELETE');
    mutateTrades();
  }, [apiCall, mutateTrades]);

  // Learnings
  const handleCreateLearning = useCallback(async (data: object) => {
    await apiCall('/api/trading-bot/learnings', 'POST', data);
  }, [apiCall]);

  // Notifications
  const handleSaveNotifications = useCallback(async (updates: Partial<BotNotificationConfig>) => {
    await apiCall('/api/trading-bot/notifications', 'PUT', updates);
    mutateNotifications();
  }, [apiCall, mutateNotifications]);

  return (
    <RoleGate role="admin">
      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <ArrowLeft size={16} />
              Admin
            </Link>
            <div className="flex items-center gap-2">
              <Bot size={20} className="text-zinc-400" />
              <h1 className="text-lg font-bold text-zinc-100">Trading Bot</h1>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-zinc-900/50 rounded-lg p-1 border border-zinc-800 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors flex-1 justify-center whitespace-nowrap ${
                activeTab === id
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <BotDashboardTab
            stats={stats}
            recentTrades={trades.slice(0, 5)}
            isLoading={statsLoading}
          />
        )}

        {activeTab === 'strategies' && (
          <BotStrategiesTab
            strategies={strategies}
            isLoading={strategiesLoading}
            onSave={handleSaveStrategy}
            onUpdate={handleUpdateStrategy}
            onDelete={handleDeleteStrategy}
            onActivate={handleActivateStrategy}
          />
        )}

        {activeTab === 'watchlist' && (
          <BotWatchlistTab
            watchlist={watchlist}
            isLoading={watchlistLoading}
            onAdd={handleAddWatchlist}
            onUpdate={handleUpdateWatchlist}
            onRemove={handleRemoveWatchlist}
          />
        )}

        {activeTab === 'trades' && (
          <BotTradesTab
            trades={trades}
            watchlist={watchlist}
            isLoading={tradesLoading}
            onCreateTrade={handleCreateTrade}
            onCloseTrade={handleCloseTrade}
            onDeleteTrade={handleDeleteTrade}
            onCreateLearning={handleCreateLearning}
          />
        )}

        {activeTab === 'settings' && (
          <BotSettingsTab
            config={config}
            notifications={notifications}
            onSaveConfig={handleSaveConfig}
            onSaveNotifications={handleSaveNotifications}
            onInitConfig={handleInitConfig}
            onTogglePortfolio={handleTogglePortfolio}
          />
        )}
      </div>
    </RoleGate>
  );
}
