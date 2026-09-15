import React, { useState } from 'react';
import { 
  BacktestResult, 
  ValidationScorecard, 
  PatternObservation, 
  StrategyDefinition, 
  UsMarketPreMarketHypothesisState 
} from '../types.ts';
import { 
  FlaskConical, 
  Play, 
  Cpu, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  BarChart3, 
  Sparkles, 
  ArrowRight,
  Search,
  BookOpen,
  Calendar,
  Globe,
  Sliders
} from 'lucide-react';

interface ResearchViewProps {
  strategies: StrategyDefinition[];
  onRunBacktest: (params: {
    strategyId: string;
    instrument: string;
    startDate: string;
    endDate: string;
    startingCapital: number;
    slippageBps: number;
  }) => Promise<{ result: BacktestResult; scorecard: ValidationScorecard }>;
  patterns: PatternObservation[];
  usMarketState: UsMarketPreMarketHypothesisState | null;
  onGenerateHypothesis: (prompt: string, market: 'CRYPTO_FUTURES' | 'US_EQUITIES') => Promise<any>;
}

export const ResearchView: React.FC<ResearchViewProps> = ({
  strategies,
  onRunBacktest,
  patterns,
  usMarketState,
  onGenerateHypothesis,
}) => {
  const [activeTab, setActiveTab] = useState<'backtests' | 'patternLab' | 'aiResearch' | 'usMarketLab'>('backtests');
  
  // Backtest form state
  const [selectedStrategy, setSelectedStrategy] = useState<string>(strategies[0]?.id || 'btc_momentum_v12');
  const [selectedInstrument, setSelectedInstrument] = useState<string>('B-BTC_USDT');
  const [capital, setCapital] = useState<number>(10000);
  const [slippageBps, setSlippageBps] = useState<number>(5);
  const [isRunningBacktest, setIsRunningBacktest] = useState(false);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [validationScorecard, setValidationScorecard] = useState<ValidationScorecard | null>(null);

  // AI Assistant state
  const [aiPrompt, setAiPrompt] = useState<string>('Analyze volatility compression breakout on CoinDCX BTC futures with order book imbalance');
  const [aiMarket, setAiMarket] = useState<'CRYPTO_FUTURES' | 'US_EQUITIES'>('CRYPTO_FUTURES');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [generatedHypothesis, setGeneratedHypothesis] = useState<any>(null);

  const handleExecuteBacktest = async () => {
    setIsRunningBacktest(true);
    try {
      const { result, scorecard } = await onRunBacktest({
        strategyId: selectedStrategy,
        instrument: selectedInstrument,
        startDate: '2026-01-01',
        endDate: '2026-09-10',
        startingCapital: capital,
        slippageBps,
      });
      setBacktestResult(result);
      setValidationScorecard(scorecard);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunningBacktest(false);
    }
  };

  const handleExecuteAiHypothesis = async () => {
    setIsGeneratingAi(true);
    try {
      const data = await onGenerateHypothesis(aiPrompt, aiMarket);
      setGeneratedHypothesis(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className="p-5 max-w-7xl mx-auto space-y-5 font-mono text-zinc-200">
      {/* Research Tabs */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-indigo-400" />
          <h1 className="text-sm font-bold tracking-wider uppercase text-zinc-100">
            QUANTITATIVE RESEARCH LABORATORY
          </h1>
        </div>

        {/* Sub-Tabs: Backtests, Pattern Lab, AI Research, US Market Lab */}
        <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-md text-xs">
          {[
            { id: 'backtests', label: 'Event-Driven Backtests' },
            { id: 'patternLab', label: 'Pattern Lab' },
            { id: 'aiResearch', label: 'AI Research Assistant' },
            { id: 'usMarketLab', label: 'U.S. Pre-Market Lab' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === tab.id
                  ? 'bg-zinc-800 text-zinc-100 font-bold shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. Event-Driven Backtests Tab */}
      {activeTab === 'backtests' && (
        <div className="space-y-5">
          {/* Controls Bar */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">STRATEGY</label>
              <select
                value={selectedStrategy}
                onChange={(e) => setSelectedStrategy(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-xs text-zinc-200 focus:outline-hidden"
              >
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.version})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">INSTRUMENT</label>
              <select
                value={selectedInstrument}
                onChange={(e) => setSelectedInstrument(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-xs text-zinc-200 focus:outline-hidden"
              >
                <option value="B-BTC_USDT">B-BTC_USDT (CoinDCX Futures)</option>
                <option value="B-ETH_USDT">B-ETH_USDT (CoinDCX Futures)</option>
                <option value="B-SOL_USDT">B-SOL_USDT (CoinDCX Futures)</option>
                <option value="NVDA">NVDA (US Equities Lab)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">STARTING CAPITAL (USDT)</label>
              <input
                type="number"
                value={capital}
                onChange={(e) => setCapital(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-xs text-zinc-200 font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">SLIPPAGE MODEL</label>
              <select
                value={slippageBps}
                onChange={(e) => setSlippageBps(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-xs text-zinc-200 focus:outline-hidden"
              >
                <option value={3}>3 bps (Conservative Liquid)</option>
                <option value={5}>5 bps (Standard Futures)</option>
                <option value={10}>10 bps (Stress Test)</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleExecuteBacktest}
                disabled={isRunningBacktest}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-xs font-bold text-white uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {isRunningBacktest ? 'Running Engine...' : 'Run Backtest'}
              </button>
            </div>
          </div>

          {/* Backtest Results & Validation Scorecard */}
          {backtestResult && validationScorecard ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Left 2 Cols: Performance Metrics & Equity Curve */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <div className="text-xs font-bold uppercase text-zinc-300">
                      Performance Summary: {backtestResult.strategyName}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      Evaluated: {backtestResult.totalTrades} Trades • Timeframe: {backtestResult.timeframe}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
                    <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
                      <div className="text-[10px] text-zinc-500">TOTAL RETURN</div>
                      <div className="text-base font-bold text-emerald-400">+{backtestResult.totalReturnPercent}%</div>
                      <div className="text-[10px] text-zinc-400">+${(backtestResult.netProfit ?? 0).toLocaleString()}</div>
                    </div>
                    <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
                      <div className="text-[10px] text-zinc-500">SHARPE / SORTINO</div>
                      <div className="text-base font-bold text-zinc-100">{backtestResult.sharpeRatio} / {backtestResult.sortinoRatio}</div>
                      <div className="text-[10px] text-zinc-400">Calmar: {backtestResult.calmarRatio}</div>
                    </div>
                    <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
                      <div className="text-[10px] text-zinc-500">MAX DRAWDOWN</div>
                      <div className="text-base font-bold text-rose-400">-{backtestResult.maxDrawdownPercent}%</div>
                      <div className="text-[10px] text-zinc-400">Duration: {backtestResult.maxDrawdownDurationDays}d</div>
                    </div>
                    <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
                      <div className="text-[10px] text-zinc-500">WIN RATE / PF</div>
                      <div className="text-base font-bold text-zinc-100">{backtestResult.winRate}%</div>
                      <div className="text-[10px] text-zinc-400">PF: {backtestResult.profitFactor}</div>
                    </div>
                  </div>

                  {/* Equity Curve */}
                  <div className="text-[11px] text-zinc-400 mb-1">Backtest Simulated Equity Progression</div>
                  <div className="h-44 w-full bg-zinc-950 rounded border border-zinc-800/80 p-2 relative">
                    <svg className="w-full h-full" viewBox="0 0 500 120" preserveAspectRatio="none">
                      <polyline
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2"
                        points={backtestResult.equityCurve
                          .map((pt, idx) => {
                            const x = (idx / Math.max(1, backtestResult.equityCurve.length - 1)) * 500;
                            const minEq = Math.min(...backtestResult.equityCurve.map(e => e.equity)) * 0.99;
                            const maxEq = Math.max(...backtestResult.equityCurve.map(e => e.equity)) * 1.01;
                            const y = 120 - ((pt.equity - minEq) / (maxEq - minEq || 1)) * 110;
                            return `${x},${y}`;
                          })
                          .join(' ')}
                      />
                    </svg>
                  </div>
                </div>

                {/* Trade Execution Distribution Log */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-xs">
                  <div className="text-xs font-bold uppercase text-zinc-300 mb-2">
                    Recent Backtest Trades Log ({backtestResult.trades.length} Total)
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-[10px] text-zinc-500 border-b border-zinc-800 uppercase">
                          <th className="pb-1">#</th>
                          <th className="pb-1">Direction</th>
                          <th className="pb-1">Entry</th>
                          <th className="pb-1">Exit</th>
                          <th className="pb-1">PnL ($)</th>
                          <th className="pb-1">PnL (%)</th>
                          <th className="pb-1 text-right">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/40">
                        {backtestResult.trades.slice(0, 8).map((t) => (
                          <tr key={t.id}>
                            <td className="py-1 text-zinc-500">{t.tradeNumber}</td>
                            <td className="py-1 font-bold">
                              <span className={t.direction === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}>
                                {t.direction}
                              </span>
                            </td>
                            <td className="py-1 text-zinc-300">${t.entryPrice}</td>
                            <td className="py-1 text-zinc-300">${t.exitPrice}</td>
                            <td className={`py-1 font-bold ${t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                            </td>
                            <td className={`py-1 ${t.pnlPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {t.pnlPercent >= 0 ? '+' : ''}{t.pnlPercent.toFixed(2)}%
                            </td>
                            <td className="py-1 text-right text-[10px] text-zinc-400">{t.exitReason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Col: Validation Scorecard according to Rule 25 */}
              <div className="space-y-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-xs">
                  <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2">
                    <div className="text-xs font-bold uppercase text-zinc-200">
                      VALIDATION SCORECARD
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      validationScorecard.overallVerdict === 'PASS'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {validationScorecard.overallVerdict} ({validationScorecard.overallScore}/100)
                    </span>
                  </div>

                  <div className="space-y-2">
                    {[
                      { name: 'In-Sample Backtest', status: validationScorecard.inSampleBacktest },
                      { name: 'Out-of-Sample (OOS)', status: validationScorecard.outOfSample },
                      { name: 'Walk Forward Stability', status: validationScorecard.walkForward },
                      { name: 'Parameter Stability', status: validationScorecard.parameterStability },
                      { name: 'Monte Carlo Reshuffling', status: validationScorecard.monteCarlo },
                      { name: 'Fee Stress (+100% Fees)', status: validationScorecard.feeStress },
                      { name: 'Slippage Stress (+150%)', status: validationScorecard.slippageStress },
                      { name: 'Regime Stability', status: validationScorecard.regimeStability },
                      { name: 'Sample Size (>=15)', status: validationScorecard.sampleSize },
                    ].map((gate) => (
                      <div key={gate.name} className="flex justify-between items-center py-1 border-b border-zinc-800/40">
                        <span className="text-zinc-400">{gate.name}:</span>
                        <span className={`font-bold text-[10px] px-1.5 py-0.5 rounded ${
                          gate.status === 'PASS'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : gate.status === 'WARN'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {gate.status}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-2.5 bg-zinc-950 rounded border border-zinc-800 text-[10px] text-zinc-400 leading-relaxed">
                    Rule 25 Gate: A strategy cannot enter Paper Trading unless all required validation gates (In-Sample, Out-of-Sample, Fee Stress) pass.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-10 text-center text-zinc-500 text-xs">
              Select strategy and click «Run Backtest» to simulate execution and generate statistical validation scorecards.
            </div>
          )}
        </div>
      )}

      {/* 2. Pattern Lab Tab */}
      {activeTab === 'patternLab' && (
        <div className="space-y-4">
          <div className="text-xs text-zinc-400">
            Statistical discovery of recurring price and order-book configurations with minimum sample counts (Rule 29).
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {patterns.map((p) => (
              <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-zinc-100">{p.patternName}</div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-400 font-bold">
                    {p.market}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] bg-zinc-950 p-2.5 rounded border border-zinc-800">
                  <div>
                    <span className="text-zinc-500 block">SAMPLES</span>
                    <span className="font-bold text-zinc-200">{p.sampleCount}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">WIN RATE</span>
                    <span className="font-bold text-emerald-400">{p.winRatePercent}%</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">EXPECTED VAL</span>
                    <span className="font-bold text-zinc-100">+{p.expectedValue}R</span>
                  </div>
                </div>
                <div className="text-[11px] text-zinc-300">
                  <strong>Regime:</strong> {p.regimeDependency}
                </div>
                <div className="text-[11px] text-zinc-400">
                  <strong>Recommended:</strong> {p.recommendedAction}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. AI Research Assistant Tab (Gemini) */}
      {activeTab === 'aiResearch' && (
        <div className="space-y-5">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase text-zinc-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Gemini Quantitative Research Assistant (Server-Side)
              </div>
              <div className="text-[10px] text-zinc-500">
                Structured Schema Outputs • Model: gemini-2.5-flash
              </div>
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Enter quantitative research query or hypothesis..."
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 focus:outline-hidden"
              />
              <select
                value={aiMarket}
                onChange={(e) => setAiMarket(e.target.value as any)}
                className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 focus:outline-hidden"
              >
                <option value="CRYPTO_FUTURES">Crypto Futures (CoinDCX)</option>
                <option value="US_EQUITIES">US Equities (Independent Lab)</option>
              </select>
              <button
                onClick={handleExecuteAiHypothesis}
                disabled={isGeneratingAi}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold uppercase"
              >
                {isGeneratingAi ? 'Synthesizing...' : 'Generate Hypothesis'}
              </button>
            </div>
          </div>

          {generatedHypothesis && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4 text-xs">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                <div className="text-sm font-bold text-zinc-100">{generatedHypothesis.title}</div>
                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded text-[10px] font-bold">
                  CONFIDENCE: {(generatedHypothesis.confidence * 100).toFixed(0)}%
                </span>
              </div>

              <div className="text-xs text-zinc-300 leading-relaxed">
                <strong>Core Hypothesis:</strong> {generatedHypothesis.hypothesis}
              </div>

              {/* Distinguish Observed Facts vs Inferences (Rule 63) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
                  <div className="text-[10px] uppercase font-bold text-emerald-400 mb-1.5">Observed Facts</div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-zinc-300">
                    {generatedHypothesis.observedFacts?.map((f: string, i: number) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
                  <div className="text-[10px] uppercase font-bold text-sky-400 mb-1.5">Inferences & Logic</div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-zinc-300">
                    {generatedHypothesis.inferences?.map((inf: string, i: number) => (
                      <li key={i}>{inf}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
                  <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Entry Conditions</div>
                  <ul className="space-y-1 text-zinc-300">
                    {generatedHypothesis.entryConditions?.map((c: string, i: number) => (
                      <li key={i}>• {c}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
                  <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Exit Conditions</div>
                  <ul className="space-y-1 text-zinc-300">
                    {generatedHypothesis.exitConditions?.map((c: string, i: number) => (
                      <li key={i}>• {c}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
                  <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Invalidating Conditions</div>
                  <ul className="space-y-1 text-zinc-300">
                    {generatedHypothesis.invalidatingConditions?.map((c: string, i: number) => (
                      <li key={i}>• {c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. US Equities Pre-Market & Opening Range Lab (Rules 2, 3, 4, 5) */}
      {activeTab === 'usMarketLab' && usMarketState && (
        <div className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-300 leading-relaxed">
            <strong>Domain Independence Notice (Rule 2):</strong> This laboratory researches U.S. Equities market structure in America/New_York session time. No signals from this laboratory are ever converted into CoinDCX cryptocurrency orders.
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <div>
                <span className="text-base font-bold text-zinc-100">{usMarketState.symbol}</span>
                <span className="text-zinc-400 ml-2">US Equities Opening Structure Session</span>
              </div>
              <div className="text-[11px] text-zinc-400">
                Session NY: <strong className="text-zinc-200">{usMarketState.sessionTimeNy}</strong> • Display IST: <strong className="text-zinc-200">{usMarketState.sessionTimeIst}</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
                <div className="text-[10px] text-zinc-500">PRE-MARKET GAP</div>
                <div className="text-base font-bold text-emerald-400">+{usMarketState.gapPercent}%</div>
                <div className="text-[10px] text-zinc-400">Prev Close: ${usMarketState.previousClose}</div>
              </div>
              <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
                <div className="text-[10px] text-zinc-500">RELATIVE VOLUME</div>
                <div className="text-base font-bold text-zinc-100">{usMarketState.relativeVolume}x</div>
                <div className="text-[10px] text-zinc-400">Pre-Vol: {(usMarketState.preMarketVolume ?? 0).toLocaleString()}</div>
              </div>
              <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
                <div className="text-[10px] text-zinc-500">15M OPENING RETURN</div>
                <div className="text-base font-bold text-sky-400">+{usMarketState.first15mReturn}%</div>
                <div className="text-[10px] text-zinc-400">Structure: {usMarketState.currentStructure}</div>
              </div>
              <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
                <div className="text-[10px] text-zinc-500">VWAP RELATIONSHIP</div>
                <div className="text-base font-bold text-amber-400">{usMarketState.vwapRelationship}</div>
                <div className="text-[10px] text-zinc-400">OR High: ${usMarketState.openingRangeHigh}</div>
              </div>
            </div>

            <div className="bg-zinc-950 p-3 rounded border border-zinc-800 text-xs leading-relaxed space-y-1">
              <div className="text-[10px] uppercase font-bold text-emerald-400">Hypothesis Statistical Evaluation</div>
              <p className="text-zinc-300">
                {usMarketState.hypothesisEvaluation.researchVerdict}
              </p>
              <div className="text-[10px] text-zinc-500 pt-1">
                p-value: {usMarketState.hypothesisEvaluation.statisticalSignificancePValue} • Pattern: {usMarketState.hypothesisEvaluation.patternType}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
