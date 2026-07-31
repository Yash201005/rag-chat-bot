import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import { apiService } from '../../services/api.js';
import { X, Activity, Clock, Cpu, Database, RefreshCw, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

export const MetricsPanel: React.FC = () => {
  const { isMetricsOpen, setMetricsOpen, systemMetrics, setSystemMetrics } = useAppStore();
  const [vectorStats, setVectorStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchMetricsData = async () => {
    setLoading(true);
    try {
      const data = await apiService.fetchMetrics();
      setSystemMetrics(data.metrics);
      setVectorStats(data.vectorStoreStats);
    } catch (err: any) {
      toast.error('Failed to fetch platform metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isMetricsOpen) {
      fetchMetricsData();
    }
  }, [isMetricsOpen]);

  if (!isMetricsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl glass-panel rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">System Operational Telemetry</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchMetricsData}
              disabled={loading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setMetricsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard
              icon={<Zap className="w-4 h-4 text-amber-400" />}
              label="Total Queries"
              value={systemMetrics.totalQueries.toString()}
            />
            <MetricCard
              icon={<Clock className="w-4 h-4 text-sky-400" />}
              label="Avg Response"
              value={`${systemMetrics.avgResponseTimeMs}ms`}
            />
            <MetricCard
              icon={<Cpu className="w-4 h-4 text-emerald-400" />}
              label="Total Tokens"
              value={systemMetrics.totalTokensProcessed.toLocaleString()}
            />
            <MetricCard
              icon={<Database className="w-4 h-4 text-indigo-400" />}
              label="Indexed Chunks"
              value={systemMetrics.totalChunksIndexed.toString()}
            />
          </div>

          {/* Latency Breakdown Card */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              Latency Breakdown Averages
            </h4>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400 text-[11px]">Embedding Generation</span>
                <p className="text-base font-bold text-white font-mono mt-0.5">
                  {systemMetrics.avgEmbeddingTimeMs} ms
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400 text-[11px]">Pinecone Vector Retrieval</span>
                <p className="text-base font-bold text-white font-mono mt-0.5">
                  {systemMetrics.avgRetrievalTimeMs} ms
                </p>
              </div>
            </div>
          </div>

          {/* Vector Store Index Stats */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
            <h4 className="font-semibold text-slate-300 flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-400" />
              Pinecone Index Health
            </h4>
            <div className="flex items-center justify-between text-slate-400">
              <span>Target Index:</span>
              <span className="font-mono text-white font-medium">rag-platform-index</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Embedding Model / Dim:</span>
              <span className="font-mono text-sky-400 font-medium">bge-small-en-v1.5 (384-dim)</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Total Vectors:</span>
              <span className="font-mono text-emerald-400 font-medium">
                {vectorStats?.totalVectorCount || systemMetrics.totalChunksIndexed}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => {
  return (
    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-400">{label}</span>
        {icon}
      </div>
      <p className="text-lg font-bold text-white font-mono tracking-tight">{value}</p>
    </div>
  );
};
