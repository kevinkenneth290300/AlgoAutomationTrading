import React from 'react';
import { ApplicationMode, Position, Signal, OrderResult, StrategyDefinition, PaperAccountSummary, DataSourceMode } from '../types.ts';
import { 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  AlertCircle, 
  Zap, 
  Cpu, 
  Activity, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight,
  Database,
  Layers,
  Wallet,
  RotateCcw,
  CheckCircle2,
  Lock
} from 'lucide-react';

interface OverviewViewProps {
  mode: ApplicationMode;
  equity: number;
  availableMargin: number;
  unrealizedPnL: number;
  positions: Position[];
  strategies: StrategyDefinition[];
  recentSignals: Signal[];
  recentOrders: OrderResult[];
  killSwitchActive: boolean;
  realAccount?: {
    isConfigured: boolean;
    connected: boolean;
    statusMessage: string;
    totalEquity: number;
    availableMargin: number;
    unrealizedPnL: number;
    positions: Position[];
  };
  paperAccount?: PaperAccountSummary;
  dataSourceMode?: DataSourceMode;
  onNavigateToTrade: () => void;
  onNavigateToResearch: () => void;
  onResetPaper?: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  mode,
  equity,
  availableMargin,
  unrealizedPnL,
  positions,
  strategies,
  recentSignals,
  recentOrders,
  killSwitchActive,
  realAccount,
  paperAccount,
  dataSourceMode = 'REAL',
  onNavigateToTrade,
  onNavigateToResearch,
  onResetPaper,
}) => {
  const activeStrategies = strategies.filter(s => s.lifecycleStatus === 'ACTIVE' || s.lifecycleStatus === 'PAPER');

  // Compute metrics from actual paper trading account or active positions
  const displayEquity = mode === 'PAPER' && paperAccount ? paperAccount.equity : equity;
  const displayMargin = mode === 'PAPER' && paperAccount ? paperAccount.availableMargin : availableMargin;
  const displayUnrealized = mode === 'PAPER' && paperAccount ? paperAccount.unrealizedPnL : unrealizedPnL;
  const displayRealized = mode === 'PAPER' && paperAccount ? paperAccount.realizedPnL : 0;
  const displayTodayPnL = displayUnrealized + displayRealized;
  const initialCap = mode === 'PAPER' && paperAccount ? paperAccount.initialCapital : (displayEquity || 25000);
  const todayPnLPct = initialCap > 0 ? (displayTodayPnL / initialCap) * 100 : 0;
  const drawdownPct = mode === 'PAPER' && paperAccount ? paperAccount.drawdownPercent : 0.0;

  // Build real or paper equity data points for chart
  const equityPoints: number[] = [];
  if (paperAccount && paperAccount.tradeHistory && paperAccount.tradeHistory.length > 0) {
    let running = paperAccount.initialCapital;
    equityPoints.push(running);
    paperAccount.tradeHistory.forEach((t: any) => {
      running += t.pnl || 0;
      equityPoints.push(running);
    });
    equityPoints.push(paperAccount.equity);
  } else {
    // Single baseline point
    equityPoints.push(initialCap);
    equityPoints.push(displayEquity);
  }

  const minEq = Math.min(...equityPoints) * 0.995;
  const maxEq = Math.max(...equityPoints) * 1.005;
  const eqRange = maxEq - minEq || 1;

  const svgWidth = 600;
  const svgHeight = 120;
  const chartPoints = equityPoints.map((val, idx) => {
    const x = (idx / Math.max(1, equityPoints.length - 1)) * svgWidth;
    const y = svgHeight - ((val - minEq) / eqRange) * (svgHeight - 20) - 10;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="p-5 max-w-7xl mx-auto space-y-5">
      {/* Top Banner: Mode & Real Data Provenance */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${mode === 'LIVE' ? 'bg-rose-500 animate-ping' : mode === 'PAPER' ? 'bg-amber-400 animate-pulse' : 'bg-sky-400 animate-pulse'}`}></div>
          <span className="font-mono text-zinc-200 font-semibold">
            {mode === 'RESEARCH' && '« RESEARCH MODE — Quantitative research active. Live orders locked. »'}
            {mode === 'PAPER' && '« PAPER TRADING MODE — Simulating execution with live CoinDCX market data. »'}
            {mode === 'BACKTEST' && '« BACKTEST MODE — Historical simulations active. »'}
            {mode === 'LIVE_DISABLED' && '« LIVE DISABLED — Live execution gateway safely offline. »'}
            {mode === 'LIVE_ARMED' && '« LIVE ARMED — Operator confirmation required for live execution. »'}
            {mode === 'LIVE' && '« LIVE TRADING — Real CoinDCX Futures execution enabled. »'}
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className={`px-2 py-0.5 rounded font-bold border ${
            dataSourceMode === 'REAL' 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}>
            DATA: {dataSourceMode === 'REAL' ? 'LIVE COINDCX FUTURES' : 'SYNTHETIC SANDBOX'}
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400">EXEC: <strong>{mode}</strong></span>
        </div>
      </div>

      {/* Dual Account Separation: Real CoinDCX vs Paper Ledger */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
        {/* Real CoinDCX Futures Account */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-zinc-100 uppercase tracking-wider text-xs">Real Account (CoinDCX Futures)</span>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
              realAccount?.connected 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}>
              {realAccount?.connected ? 'CONNECTED' : 'UNAUTHENTICATED'}
            </span>
          </div>

          {realAccount?.connected ? (
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div>
                <span className="text-[10px] text-zinc-500 block">REAL EQUITY</span>
                <span className="text-sm font-bold text-zinc-100">${(realAccount.totalEquity ?? 0).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block">AVAIL. MARGIN</span>
                <span className="text-sm font-bold text-zinc-100">${(realAccount.availableMargin ?? 0).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block">REAL POSITIONS</span>
                <span className="text-sm font-bold text-zinc-100">{realAccount.positions?.length || 0}</span>
              </div>
            </div>
          ) : (
            <div className="p-2.5 bg-zinc-950/80 rounded border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                CoinDCX API Credentials Not Set
              </div>
              <p className="text-[10px] text-zinc-500">
                Live trading is locked. Real market data is streaming publicly without credentials. Add COINDCX_API_KEY & COINDCX_API_SECRET to enable live account balance queries.
              </p>
            </div>
          )}
        </div>

        {/* Paper Trading Account */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-zinc-100 uppercase tracking-wider text-xs">Paper Trading Account</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/30">PROVENANCE: PAPER</span>
            </div>
            {onResetPaper && (
              <button
                onClick={onResetPaper}
                className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 rounded transition"
                title="Reset Paper Account to $25,000 Initial Capital"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 pt-1 text-xs">
            <div>
              <span className="text-[10px] text-zinc-500 block">PAPER EQUITY</span>
              <span className="text-sm font-bold text-zinc-100">${(paperAccount?.equity ?? 25000).toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block">REALIZED PNL</span>
              <span className={`text-sm font-bold ${(paperAccount?.realizedPnL ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {(paperAccount?.realizedPnL ?? 0) >= 0 ? '+' : ''}${(paperAccount?.realizedPnL ?? 0).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block">UNREALIZED PNL</span>
              <span className={`text-sm font-bold ${(paperAccount?.unrealizedPnL ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {(paperAccount?.unrealizedPnL ?? 0) >= 0 ? '+' : ''}${(paperAccount?.unrealizedPnL ?? 0).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block">WIN RATE</span>
              <span className="text-sm font-bold text-zinc-200">
                {paperAccount?.closedTradesCount ? `${(paperAccount.winRate * 100).toFixed(1)}%` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Key Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Account Equity */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-3.5 rounded-lg">
          <div className="text-[11px] font-mono uppercase text-zinc-500 mb-1 flex justify-between">
            <span>Account Equity</span>
            <span className="text-[9px] text-zinc-400 font-bold">[{mode}]</span>
          </div>
          <div className="text-lg font-bold font-mono text-zinc-100">${(displayEquity ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          <div className="text-[10px] text-zinc-400 mt-1 font-mono">Settlement: USDT</div>
        </div>

        {/* Available Margin */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-3.5 rounded-lg">
          <div className="text-[11px] font-mono uppercase text-zinc-500 mb-1">Available Margin</div>
          <div className="text-lg font-bold font-mono text-zinc-100">${(displayMargin ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          <div className="text-[10px] text-zinc-400 mt-1 font-mono">
            Ratio: {(((displayMargin ?? 0) / (displayEquity || 1)) * 100).toFixed(1)}%
          </div>
        </div>

        {/* Combined PnL */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-3.5 rounded-lg">
          <div className="text-[11px] font-mono uppercase text-zinc-500 mb-1">Mark-to-Market PnL</div>
          <div className={`text-lg font-bold font-mono flex items-center gap-1 ${displayTodayPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {displayTodayPnL >= 0 ? '+' : ''}${displayTodayPnL.toFixed(2)}
            <span className="text-xs font-normal">({displayTodayPnL >= 0 ? '+' : ''}{todayPnLPct.toFixed(2)}%)</span>
          </div>
          <div className="text-[10px] text-zinc-400 mt-1 font-mono">
            Unrealized: ${(displayUnrealized ?? 0).toFixed(2)}
          </div>
        </div>

        {/* Max Drawdown */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-3.5 rounded-lg">
          <div className="text-[11px] font-mono uppercase text-zinc-500 mb-1">Current Drawdown</div>
          <div className={`text-lg font-bold font-mono ${drawdownPct > 5 ? 'text-amber-400' : 'text-zinc-100'}`}>
            {drawdownPct.toFixed(2)}%
          </div>
          <div className="text-[10px] text-zinc-400 mt-1 font-mono">Risk Limit: 10.0%</div>
        </div>

        {/* Open Positions */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-3.5 rounded-lg">
          <div className="text-[11px] font-mono uppercase text-zinc-500 mb-1">Open Positions</div>
          <div className="text-lg font-bold font-mono text-zinc-100">{positions.length} Active</div>
          <div className="text-[10px] text-zinc-400 mt-1 font-mono">Max Limit: 3</div>
        </div>

        {/* Active Strategies */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-3.5 rounded-lg">
          <div className="text-[11px] font-mono uppercase text-zinc-500 mb-1">Active Strategies</div>
          <div className="text-lg font-bold font-mono text-zinc-100">{activeStrategies.length} Deployed</div>
          <div className="text-[10px] text-zinc-400 mt-1 font-mono">Registered: {strategies.length}</div>
        </div>
      </div>

      {/* Main Grid: Equity Chart + Recent Signals + Open Positions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 font-mono">
        {/* Left 2 Cols: Performance Chart & Open Positions */}
        <div className="lg:col-span-2 space-y-5">
          {/* Equity Curve Mini-Chart */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold uppercase text-zinc-300 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Equity Performance Track</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-zinc-800 text-zinc-400 border border-zinc-700">
                  {mode === 'PAPER' ? 'PAPER LEDGER' : 'REAL COINDCX'}
                </span>
              </div>
              <div className="text-[11px] text-zinc-400">
                Current: <span className="text-zinc-100 font-bold">${displayEquity.toLocaleString()}</span>
              </div>
            </div>

            {/* SVG Dynamic Equity Curve */}
            <div className="h-36 w-full relative">
              <svg className="w-full h-full" viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Horizontal Grid lines */}
                <line x1="0" y1="20" x2={svgWidth} y2="20" stroke="#27272a" strokeDasharray="3 3" />
                <line x1="0" y1="60" x2={svgWidth} y2="60" stroke="#27272a" strokeDasharray="3 3" />
                <line x1="0" y1="100" x2={svgWidth} y2="100" stroke="#27272a" strokeDasharray="3 3" />

                {/* Shaded Area */}
                {chartPoints && (
                  <polygon
                    fill="url(#equityGrad)"
                    points={`0,${svgHeight} ${chartPoints} ${svgWidth},${svgHeight}`}
                  />
                )}
                {/* Line */}
                {chartPoints && (
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    points={chartPoints}
                  />
                )}
              </svg>
              <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                <span>Baseline (${initialCap.toLocaleString()})</span>
                <span>Current (${displayEquity.toLocaleString()})</span>
              </div>
            </div>
          </div>

          {/* Active Positions Summary */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold uppercase text-zinc-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-400" />
                Open Futures Positions ({positions.length})
              </div>
              <button
                onClick={onNavigateToTrade}
                className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1"
              >
                Go to Terminal <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            {positions.length === 0 ? (
              <div className="text-xs text-zinc-500 py-6 text-center">
                No active open positions. Place an order from the Trade Terminal.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 text-[10px] uppercase">
                      <th className="pb-2">Instrument</th>
                      <th className="pb-2">Type</th>
                      <th className="pb-2">Side</th>
                      <th className="pb-2">Quantity</th>
                      <th className="pb-2">Entry</th>
                      <th className="pb-2">Mark</th>
                      <th className="pb-2">Leverage</th>
                      <th className="pb-2 text-right">Unrealized PnL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {positions.map((pos) => (
                      <tr key={pos.instrument} className="hover:bg-zinc-800/40">
                        <td className="py-2.5 font-bold text-zinc-200">{pos.instrument}</td>
                        <td className="py-2.5">
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-zinc-800 text-zinc-400 border border-zinc-700">
                            {pos.provenance || (mode === 'PAPER' ? 'PAPER' : 'LIVE')}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            pos.side === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {pos.side}
                          </span>
                        </td>
                        <td className="py-2.5 text-zinc-300">{pos.quantity}</td>
                        <td className="py-2.5 text-zinc-300">${(pos.entryPrice ?? 0).toLocaleString()}</td>
                        <td className="py-2.5 text-zinc-300">${(pos.markPrice ?? 0).toLocaleString()}</td>
                        <td className="py-2.5 text-zinc-400">{pos.leverage}x</td>
                        <td className={`py-2.5 text-right font-bold ${pos.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {pos.unrealizedPnL >= 0 ? '+' : ''}${pos.unrealizedPnL.toFixed(2)} ({pos.unrealizedPnLPercent.toFixed(2)}%)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Recent Signals & System Safety Status */}
        <div className="space-y-5">
          {/* Recent Signals Feed */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="text-xs font-semibold uppercase text-zinc-300 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Quantitative Signals
              </span>
              <button onClick={onNavigateToResearch} className="text-[10px] text-zinc-400 hover:text-zinc-200">
                Research Lab
              </button>
            </div>
            {recentSignals.length === 0 ? (
              <div className="text-zinc-500 text-xs py-4 text-center">No recent strategy signals generated.</div>
            ) : (
              <div className="space-y-2.5">
                {recentSignals.slice(0, 3).map((sig) => (
                  <div key={sig.id} className="p-2.5 bg-zinc-950/80 rounded border border-zinc-800/80 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-zinc-200">{sig.instrument}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        sig.direction === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {sig.direction}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-400 mb-1.5">
                      Strategy: {sig.strategyId} ({sig.strategyVersion})
                    </div>
                    <div className="text-[11px] text-zinc-300">
                      {sig.reasons[0] || 'Technical alignment confirmed.'}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1 flex justify-between">
                      <span>Conf: {(sig.confidence * 100).toFixed(0)}%</span>
                      <span>{new Date(sig.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* System Safety Status */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="text-xs font-semibold uppercase text-zinc-300 mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Risk Authority Summary
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-zinc-800/60 text-zinc-400">
                <span>Global Kill Switch:</span>
                <span className={killSwitchActive ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                  {killSwitchActive ? 'ARMED / ACTIVE' : 'DISARMED (SAFE)'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60 text-zinc-400">
                <span>Execution Gateway:</span>
                <span className="text-zinc-200">CoinDCX Futures REST</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60 text-zinc-400">
                <span>Data Feed:</span>
                <span className="text-emerald-400">Public Futures Candles & Orderbook</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60 text-zinc-400">
                <span>Domain Independence:</span>
                <span className="text-zinc-200">US Lab decoupled from Crypto</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
