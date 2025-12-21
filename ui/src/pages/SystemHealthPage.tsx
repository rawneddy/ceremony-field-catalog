import React from 'react';
import {
  Activity,
  Database,
  Clock,
  HardDrive,
  Search,
  Upload,
  Layers,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useSystemHealth, useSystemStats } from '../hooks/useSystemHealth';
import { Skeleton } from '../components/ui';
import type { LatencyStats } from '../types';

const SystemHealthPage: React.FC = () => {
  const { data: health, isLoading: healthLoading, error: healthError, refetch: refetchHealth } = useSystemHealth();
  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useSystemStats();

  const handleRefresh = () => {
    refetchHealth();
    refetchStats();
  };

  return (
    <Layout>
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-ceremony" />
              <h1 className="text-2xl font-bold text-ink">System Health</h1>
            </div>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-ink hover:bg-slate-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Health Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {healthLoading ? (
              <>
                <Skeleton variant="card" />
                <Skeleton variant="card" />
                <Skeleton variant="card" />
              </>
            ) : healthError ? (
              <div className="col-span-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                Failed to load health status
              </div>
            ) : health ? (
              <>
                <HealthCard
                  icon={Activity}
                  title="System Status"
                  value={health.status}
                  status={health.status === 'UP' ? 'success' : 'error'}
                  subtitle={`Uptime: ${health.uptime}`}
                />
                <HealthCard
                  icon={Database}
                  title="MongoDB"
                  value={health.mongoStatus}
                  status={health.mongoStatus === 'UP' ? 'success' : 'error'}
                  subtitle="Database connection"
                />
                <HealthCard
                  icon={HardDrive}
                  title="Memory"
                  value={`${health.memory.usagePercent.toFixed(1)}%`}
                  status={health.memory.usagePercent < 80 ? 'success' : health.memory.usagePercent < 90 ? 'warning' : 'error'}
                  subtitle={`${health.memory.usedMb} MB / ${health.memory.maxMb} MB`}
                />
              </>
            ) : null}
          </div>

          {/* Activity Stats */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-ink mb-4">Activity Statistics</h2>
            {statsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Skeleton variant="card" />
                <Skeleton variant="card" />
                <Skeleton variant="card" />
                <Skeleton variant="card" />
              </div>
            ) : statsError ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                Failed to load statistics
              </div>
            ) : stats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  icon={Upload}
                  title="Observations"
                  value={formatNumber(stats.observationsSubmitted)}
                  subtitle={`${formatNumber(stats.batchesProcessed)} batches`}
                />
                <StatCard
                  icon={Search}
                  title="Searches"
                  value={formatNumber(stats.searchesExecuted)}
                  subtitle={`Avg: ${stats.searchLatency.meanMs.toFixed(1)}ms`}
                />
                <StatCard
                  icon={Layers}
                  title="Contexts"
                  value={stats.activeContexts.toString()}
                  subtitle={`${formatNumber(stats.contextsCreated)} created`}
                />
                <StatCard
                  icon={Database}
                  title="Total Fields"
                  value={formatNumber(stats.totalFields)}
                  subtitle="Across all contexts"
                />
              </div>
            ) : null}
          </div>

          {/* Latency Stats */}
          {stats && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-ink mb-4">Performance Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <LatencyCard title="Search Latency" stats={stats.searchLatency} />
                <LatencyCard title="Merge Latency" stats={stats.mergeLatency} />
              </div>
            </div>
          )}

          {/* Context Breakdown */}
          {stats && stats.contextFieldCounts.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-ink mb-4">Context Breakdown</h2>
              <div className="bg-white border border-steel rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-steel">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        Context
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                        Fields
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-steel/50">
                    {stats.contextFieldCounts.map((ctx) => (
                      <tr key={ctx.contextId} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-ink">{ctx.displayName}</div>
                          <div className="text-xs text-slate-500 font-mono">{ctx.contextId}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {formatNumber(ctx.fieldCount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                              ctx.active
                                ? 'bg-mint/20 text-green-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {ctx.active ? (
                              <>
                                <CheckCircle className="w-3 h-3" />
                                Active
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3" />
                                Inactive
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

// ==================== Helper Components ====================

interface HealthCardProps {
  icon: React.FC<{ className?: string }>;
  title: string;
  value: string;
  status: 'success' | 'warning' | 'error';
  subtitle: string;
}

const HealthCard: React.FC<HealthCardProps> = ({ icon: Icon, title, value, status, subtitle }) => {
  const statusColors = {
    success: 'text-green-600 bg-green-50 border-green-200',
    warning: 'text-amber-600 bg-amber-50 border-amber-200',
    error: 'text-red-600 bg-red-50 border-red-200',
  };

  const StatusIcon = status === 'success' ? CheckCircle : status === 'warning' ? AlertCircle : XCircle;

  return (
    <div className={`p-4 rounded-lg border ${statusColors[status]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5" />
          <span className="font-medium">{title}</span>
        </div>
        <StatusIcon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-sm opacity-75">{subtitle}</div>
    </div>
  );
};

interface StatCardProps {
  icon: React.FC<{ className?: string }>;
  title: string;
  value: string;
  subtitle: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value, subtitle }) => (
  <div className="p-4 bg-white border border-steel rounded-lg">
    <div className="flex items-center gap-2 text-slate-500 mb-2">
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">{title}</span>
    </div>
    <div className="text-2xl font-bold text-ink">{value}</div>
    <div className="text-xs text-slate-500 mt-1">{subtitle}</div>
  </div>
);

interface LatencyCardProps {
  title: string;
  stats: LatencyStats;
}

const LatencyCard: React.FC<LatencyCardProps> = ({ title, stats }) => (
  <div className="p-4 bg-white border border-steel rounded-lg">
    <div className="flex items-center gap-2 mb-4">
      <Clock className="w-5 h-5 text-ceremony" />
      <span className="font-semibold text-ink">{title}</span>
      <span className="text-xs text-slate-500 ml-auto">
        {formatNumber(stats.count)} operations
      </span>
    </div>
    {stats.count > 0 ? (
      <div className="grid grid-cols-4 gap-4 text-center">
        <div>
          <div className="text-xs text-slate-500 mb-1">Mean</div>
          <div className="text-lg font-mono font-medium">{stats.meanMs.toFixed(1)}<span className="text-xs text-slate-400">ms</span></div>
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">P50</div>
          <div className="text-lg font-mono font-medium">{stats.p50Ms.toFixed(1)}<span className="text-xs text-slate-400">ms</span></div>
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">P95</div>
          <div className="text-lg font-mono font-medium">{stats.p95Ms.toFixed(1)}<span className="text-xs text-slate-400">ms</span></div>
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Max</div>
          <div className="text-lg font-mono font-medium">{stats.maxMs.toFixed(1)}<span className="text-xs text-slate-400">ms</span></div>
        </div>
      </div>
    ) : (
      <div className="text-center text-slate-400 py-4">No data yet</div>
    )}
  </div>
);

// ==================== Utility Functions ====================

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
}

export default SystemHealthPage;
