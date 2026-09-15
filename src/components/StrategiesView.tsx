import React, { useState } from 'react';
import { StrategyDefinition, StrategyLifecycleStatus } from '../types.ts';
import { Layers, ShieldCheck, AlertCircle, TrendingUp, CheckCircle, ArrowRight, Activity } from 'lucide-react';

interface StrategiesViewProps {
  strategies: StrategyDefinition[];
  onUpdateStatus?: (strategyId: string, newStatus: StrategyLifecycleStatus) => void;
}

export const StrategiesView: React.FC<StrategiesViewProps> = ({
  strategies,
  onUpdateStatus,
}) => {
  const [selectedMarket, setSelectedMarket] = useState<'ALL' | 'CRYPTO_FUTURES' | 'US_EQUITIES'>('ALL');

  const filtered = strategies.filter(
    (s) => selectedMarket === 'ALL' || s.market === selectedMarket
  );

  const getStatusBadge = (status: StrategyLifecycleStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'PAPER':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'OUT_OF_SAMPLE':
        return 'bg-sky-500/20 text-sky-400 border-sky-500/40';
      case 'VALIDATING':
        return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40';
      case 'BACKTESTING':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
      case 'DEGRADED':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      default:
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  return (
    <div className="p-5 max-w-7xl mx-auto space-y-5 font-mono text-zinc-200">
      {/* Header with Market Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div>
          <h1 className="text-sm font-bold tracking-wider uppercase text-zinc-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            STRATEGY LIFECYCLE REGISTRY
          </h1>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Strict gatekeeping: DISCOVERED → BACKTESTING → VALIDATING → OOS → PAPER → APPROVED → ACTIVE (Rule 26)
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex bg-zinc-900 border border-zinc-800 p-0.5 rounded text-xs">
          {(['ALL', 'CRYPTO_FUTURES', 'US_EQUITIES'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMarket(m)}
              className={`px-3 py-1 rounded transition-colors ${
                selectedMarket === m ? 'bg-zinc-800 text-zinc-100 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {m === 'ALL' ? 'All Markets' : m.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Strategies Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden text-xs">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-zinc-950/80 text-[10px] text-zinc-500 uppercase border-b border-zinc-800">
              <th className="py-3 px-4">Strategy & Version</th>
              <th className="py-3 px-3">Market</th>
              <th className="py-3 px-3">Pair / Ticker</th>
              <th className="py-3 px-3">Lifecycle Status</th>
              <th className="py-3 px-3 text-center">Validation Score</th>
              <th className="py-3 px-3 text-center">OOS Score</th>
              <th className="py-3 px-3 text-center">Max Drawdown</th>
              <th className="py-3 px-3 text-center">Sharpe</th>
              <th className="py-3 px-4 text-right">Health</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {filtered.map((s) => (
              <tr key={s.id} className="hover:bg-zinc-800/30 transition-colors">
                <td className="py-3 px-4">
                  <div className="font-bold text-zinc-100">{s.name}</div>
                  <div className="text-[10px] text-zinc-500">
                    ID: {s.id} • v{s.version} • Author: {s.author}
                  </div>
                </td>
                <td className="py-3 px-3 text-zinc-400 text-[11px]">
                  {s.market === 'CRYPTO_FUTURES' ? 'CoinDCX Futures' : 'US Equities Lab'}
                </td>
                <td className="py-3 px-3 font-bold text-zinc-200">{s.instrument}</td>
                <td className="py-3 px-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadge(s.lifecycleStatus)}`}>
                    {s.lifecycleStatus}
                  </span>
                </td>
                <td className="py-3 px-3 text-center font-bold text-zinc-100">
                  {s.validationScore ? `${s.validationScore}/100` : '—'}
                </td>
                <td className="py-3 px-3 text-center font-bold text-zinc-100">
                  {s.outOfSampleScore ? `${s.outOfSampleScore}/100` : '—'}
                </td>
                <td className="py-3 px-3 text-center font-bold text-rose-400">
                  {s.maxDrawdownPercent ? `-${s.maxDrawdownPercent}%` : '—'}
                </td>
                <td className="py-3 px-3 text-center font-bold text-emerald-400">
                  {s.sharpeRatio || '—'}
                </td>
                <td className="py-3 px-4 text-right">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    s.healthStatus === 'HEALTHY'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {s.healthStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Strategy Description Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.slice(0, 4).map((s) => (
          <div key={s.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <div className="font-bold text-zinc-200">{s.name}</div>
              <span className="text-[10px] text-zinc-500 font-mono">TF: {s.timeframe}</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">{s.description}</p>
            <div className="text-[10px] text-zinc-500 pt-2 border-t border-zinc-800/60 flex flex-wrap gap-1">
              <span className="text-zinc-400 font-bold">Features:</span>
              {s.requiredFeatures.map((f) => (
                <span key={f} className="bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 text-zinc-300">
                  {f}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
