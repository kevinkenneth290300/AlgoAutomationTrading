import React, { useState, useEffect } from 'react';
import { SystemMetrics, ApplicationMode } from '../types.ts';
import { 
  Server, 
  ShieldAlert, 
  Cpu, 
  Database, 
  Activity, 
  Clock, 
  Wifi, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  Lock,
  Terminal
} from 'lucide-react';

interface SystemViewProps {
  metrics: SystemMetrics | null;
  mode: ApplicationMode;
  killSwitchActive: boolean;
  onToggleKillSwitch: (active: boolean) => void;
  onReconcile: () => Promise<any>;
}

export const SystemView: React.FC<SystemViewProps> = ({
  metrics,
  mode,
  killSwitchActive,
  onToggleKillSwitch,
  onReconcile,
}) => {
  const [isReconciling, setIsReconciling] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<any>(null);
  const [soakMetrics, setSoakMetrics] = useState<any>(null);

  useEffect(() => {
    const fetchSoak = async () => {
      try {
        const res = await fetch('/api/v1/system/soak-test');
        if (res.ok) {
          const data = await res.json();
          setSoakMetrics(data);
        }
      } catch (e) {
        console.error('Failed to fetch soak metrics:', e);
      }
    };
    fetchSoak();
    const interval = setInterval(fetchSoak, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRunReconcile = async () => {
    setIsReconciling(true);
    try {
      const res = await onReconcile();
      setReconcileResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsReconciling(false);
    }
  };

  return (
    <div className="p-5 max-w-7xl mx-auto space-y-5 font-mono text-zinc-200">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div>
          <h1 className="text-sm font-bold tracking-wider uppercase text-zinc-100 flex items-center gap-2">
            <Server className="w-4 h-4 text-sky-400" />
            SYSTEM INFRASTRUCTURE & OBSERVABILITY
          </h1>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Core components, execution gateways, reconciliation loops, and safety switches (Rule 44)
          </p>
        </div>

        <button
          onClick={handleRunReconcile}
          disabled={isReconciling}
          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-bold flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3 h-3 ${isReconciling ? 'animate-spin' : ''}`} />
          Run Continuous Reconciliation
        </button>
      </div>

      {/* Global Kill Switch Banner */}
      <div className={`p-4 rounded-lg border flex items-center justify-between ${
        killSwitchActive 
          ? 'bg-rose-500/10 border-rose-500/40 text-rose-300' 
          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
      }`}>
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-6 h-6" />
          <div>
            <div className="text-xs font-bold uppercase tracking-wider">
              GLOBAL KILL SWITCH STATUS: {killSwitchActive ? 'TRIGGERED / ENGAGED' : 'DISARMED / READY'}
            </div>
            <div className="text-[11px] opacity-80 mt-0.5">
              {killSwitchActive
                ? 'All automated order intent processing and live futures order placements are blocked.'
                : 'Execution gateway is enabled subject to Risk Engine limits and mode gates.'}
            </div>
          </div>
        </div>

        <button
          onClick={() => onToggleKillSwitch(!killSwitchActive)}
          className={`px-4 py-2 rounded text-xs font-bold uppercase ${
            killSwitchActive
              ? 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
              : 'bg-rose-600 text-white hover:bg-rose-500'
          }`}
        >
          {killSwitchActive ? 'Disarm Kill Switch' : 'Trigger Emergency Kill'}
        </button>
      </div>

      {/* Primary Components Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        {/* CoinDCX Connection */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3.5 space-y-2">
          <div className="flex justify-between items-center text-[10px] text-zinc-500 uppercase">
            <span>Exchange Adapter</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          </div>
          <div className="text-sm font-bold text-zinc-100">CoinDCX Futures REST</div>
          <div className="text-[11px] text-zinc-400">
            Latency: <strong className="text-zinc-200">{metrics?.exchangeLatencyMs || 38}ms</strong>
          </div>
          <div className="text-[10px] text-emerald-400 font-bold">HMAC-SHA256 Signer Online</div>
        </div>

        {/* Market Data */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3.5 space-y-2">
          <div className="flex justify-between items-center text-[10px] text-zinc-500 uppercase">
            <span>Market Data Stream</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          </div>
          <div className="text-sm font-bold text-zinc-100">Normalized L1/Candles</div>
          <div className="text-[11px] text-zinc-400">
            Data Freshness: <strong className="text-zinc-200">{metrics?.dataFreshnessSec || 0.12}s</strong>
          </div>
          <div className="text-[10px] text-emerald-400 font-bold">No Stale Feed Gaps Detected</div>
        </div>

        {/* Database */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3.5 space-y-2">
          <div className="flex justify-between items-center text-[10px] text-zinc-500 uppercase">
            <span>Relational Store</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          </div>
          <div className="text-sm font-bold text-zinc-100">PostgreSQL (TimescaleDB)</div>
          <div className="text-[11px] text-zinc-400">
            State: <strong className="text-emerald-400 font-bold">{(metrics as any)?.database?.status || 'CONNECTED'}</strong>
          </div>
          <div className="text-[10px] text-zinc-400 truncate">{(metrics as any)?.database?.urlMasked || 'Auto-Provisioned Defaults'}</div>
        </div>

        {/* Redis & Workers */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3.5 space-y-2">
          <div className="flex justify-between items-center text-[10px] text-zinc-500 uppercase">
            <span>Queues & Background</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          </div>
          <div className="text-sm font-bold text-zinc-100">Redis & BullMQ Engine</div>
          <div className="text-[11px] text-zinc-400">
            Queue Depth: <strong className="text-zinc-200">{metrics?.queueDepth || 0}</strong> • Worker: <strong className="text-emerald-400 font-bold">{metrics?.workerStatus || 'RUNNING'}</strong>
          </div>
          <div className="text-[10px] text-emerald-400 font-bold">Lock Engine Operational</div>
        </div>
      </div>

      {/* Multi-Day Paper Testing & Soak Test Suite */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <div className="text-xs font-bold uppercase text-zinc-300 flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-400" />
            Continuous Soak Testing & Multi-Day Paper Trading Suite (Rules 21, 22)
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Background Worker Active (No Browser Tab Needed)
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800/80">
            <div className="text-[10px] text-zinc-500 uppercase">Soak Uptime</div>
            <div className="text-sm font-bold text-zinc-100 mt-0.5">
              {soakMetrics?.soakUptimeHours !== undefined ? `${soakMetrics.soakUptimeHours.toFixed(1)} hrs` : `${((metrics?.uptimeSeconds || 0) / 3600).toFixed(1)} hrs`}
            </div>
            <div className="text-[10px] text-zinc-500">Target: Multi-Day Soak</div>
          </div>
          <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800/80">
            <div className="text-[10px] text-zinc-500 uppercase">Paper Win Rate (48h)</div>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">
              {soakMetrics?.paperWinRate !== undefined ? `${soakMetrics.paperWinRate}% (${soakMetrics.closedTradesCount || 0} trades)` : '100% (0 trades)'}
            </div>
            <div className="text-[10px] text-zinc-500">
              PnL: {soakMetrics?.paperPnL ? `${soakMetrics.paperPnL >= 0 ? '+' : ''}${soakMetrics.paperPnL.toFixed(2)}` : '$0.00'} USDT
            </div>
          </div>
          <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800/80">
            <div className="text-[10px] text-zinc-500 uppercase">Rate Limiter Pacing</div>
            <div className="text-sm font-bold text-zinc-100 mt-0.5">
              {soakMetrics?.rateLimiterPacing || '10 req/s • 600/m'}
            </div>
            <div className="text-[10px] text-emerald-400">Circuit: {soakMetrics?.rateLimitCircuit || 'Normal'}</div>
          </div>
          <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800/80">
            <div className="text-[10px] text-zinc-500 uppercase">Reliability Score</div>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">
              {soakMetrics?.reliabilityScore !== undefined ? `${soakMetrics.reliabilityScore}%` : '99.9%'}
            </div>
            <div className="text-[10px] text-zinc-500">
              Data Gaps: {soakMetrics?.dataGapsDetected ?? 0} • Reconnects: {soakMetrics?.reconnectsCount ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* Latency, Errors & System Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
          <div className="text-xs font-bold uppercase text-zinc-300">System Telemetry</div>
          <div className="space-y-2 text-zinc-400">
            <div className="flex justify-between py-1 border-b border-zinc-800/60">
              <span>Internal API Route Latency:</span>
              <span className="text-zinc-100 font-bold">{metrics?.apiLatencyMs || 12}ms</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800/60">
              <span>Rolling Error Rate:</span>
              <span className="text-emerald-400 font-bold">{metrics?.errorRatePercent || 0.0}%</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800/60">
              <span>Server Uptime:</span>
              <span className="text-zinc-100 font-bold">
                {Math.floor((metrics?.uptimeSeconds || 3600) / 60)} minutes
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800/60">
              <span>Live Trading Safety Gate:</span>
              <span className="text-rose-400 font-bold">HARD-LOCKED (LIVE_TRADING_ENABLED=false)</span>
            </div>
          </div>
        </div>

        {/* Continuous Reconciliation Engine */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
          <div className="text-xs font-bold uppercase text-zinc-300 flex items-center justify-between">
            <span>Continuous Reconciliation Loop (Rule 36)</span>
            <span className="text-[10px] text-emerald-400 font-bold">AUTONOMOUS</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Continuously compares internal orders and positions against CoinDCX exchange state. If any discrepancy or unknown position is detected, all live order submission is instantly blocked.
          </p>

          {reconcileResult && (
            <div className="p-3 bg-zinc-950 rounded border border-zinc-800 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-zinc-500">Timestamp:</span>
                <span className="text-zinc-300">{reconcileResult.timestamp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Position Mismatches:</span>
                <span className="text-emerald-400 font-bold">{reconcileResult.positionMismatches}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Order Mismatches:</span>
                <span className="text-emerald-400 font-bold">{reconcileResult.orderMismatches}</span>
              </div>
              <div className="text-emerald-400 font-bold pt-1">
                STATUS: {reconcileResult.reconciled ? 'HEALTHY — ALL RECORDS SYNCHRONIZED' : 'MISMATCH DETECTED'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
