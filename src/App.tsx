import React, { useState, useEffect, useCallback } from 'react';
import { 
  NavigationTab, 
  ApplicationMode, 
  Instrument, 
  Candle, 
  Position, 
  Signal, 
  OrderResult, 
  StrategyDefinition, 
  PatternObservation, 
  UsMarketPreMarketHypothesisState, 
  SystemMetrics, 
  RiskDecision 
} from './types.ts';
import { Header } from './components/Header.tsx';
import { OverviewView } from './components/OverviewView.tsx';
import { TradeView } from './components/TradeView.tsx';
import { ResearchView } from './components/ResearchView.tsx';
import { StrategiesView } from './components/StrategiesView.tsx';
import { SystemView } from './components/SystemView.tsx';
import { OrderPreviewModal } from './components/OrderPreviewModal.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('Overview');
  const [mode, setMode] = useState<ApplicationMode>('RESEARCH');
  const [liveTradingEnabledEnv, setLiveTradingEnabledEnv] = useState<boolean>(false);
  const [killSwitchActive, setKillSwitchActive] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number>(38);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [dataSourceMode, setDataSourceMode] = useState<'REAL' | 'MOCK'>('REAL');
  const [dataFreshnessSec, setDataFreshnessSec] = useState<number>(0.5);

  // Core domain data states
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [selectedInstrument, setSelectedInstrument] = useState<string>('B-BTC_USDT');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<OrderResult[]>([]);
  const [strategies, setStrategies] = useState<StrategyDefinition[]>([]);
  const [recentSignals, setRecentSignals] = useState<Signal[]>([]);
  const [patterns, setPatterns] = useState<PatternObservation[]>([]);
  const [usMarketState, setUsMarketState] = useState<UsMarketPreMarketHypothesisState | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  
  // Account balances
  const [equity, setEquity] = useState<number>(25480.50);
  const [availableMargin, setAvailableMargin] = useState<number>(22150.00);
  const [unrealizedPnL, setUnrealizedPnL] = useState<number>(348.50);

  // Order preview state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [pendingOrderIntent, setPendingOrderIntent] = useState<any>(null);
  const [activeRiskDecision, setActiveRiskDecision] = useState<RiskDecision | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Helper to safely parse JSON responses
  const fetchJson = async <T,>(url: string, fallback: T): Promise<T> => {
    try {
      const res = await fetch(url);
      if (!res.ok) return fallback;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return fallback;
      return (await res.json()) as T;
    } catch {
      return fallback;
    }
  };

  // Fetch initial state
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    const start = performance.now();
    try {
      // 1. Mode & Environment
      const modeData = await fetchJson<any>('/api/v1/mode', null);
      if (modeData) {
        setMode(modeData.mode || 'RESEARCH');
        setLiveTradingEnabledEnv(Boolean(modeData.liveTradingEnabled));
        if (modeData.dataSourceMode) setDataSourceMode(modeData.dataSourceMode);
        if (typeof modeData.dataFreshnessSec === 'number') setDataFreshnessSec(modeData.dataFreshnessSec);
      }

      // 2. Instruments
      const instData = await fetchJson<Instrument[]>('/api/v1/instruments', []);
      if (instData.length > 0) {
        setInstruments(instData);
      }

      // 3. Account
      const accData = await fetchJson<any>('/api/v1/account/summary', null);
      if (accData) {
        setEquity(Number(accData.equity ?? accData.totalEquity ?? 25480.50));
        setAvailableMargin(Number(accData.availableMargin ?? 22150.00));
        setUnrealizedPnL(Number(accData.unrealizedPnL ?? 0));
      }

      // 4. Positions
      const posData = await fetchJson<Position[]>('/api/v1/positions', []);
      setPositions(posData);

      // 5. Strategies
      const stratData = await fetchJson<StrategyDefinition[]>('/api/v1/strategies', []);
      setStrategies(stratData);

      // 6. Signals
      const sigData = await fetchJson<Signal[]>('/api/v1/signals', []);
      setRecentSignals(sigData);

      // 7. Patterns
      const patData = await fetchJson<PatternObservation[]>('/api/v1/patterns', []);
      setPatterns(patData);

      // 8. US Market
      const usData = await fetchJson<UsMarketPreMarketHypothesisState | null>('/api/v1/us-market/hypothesis', null);
      if (usData) {
        setUsMarketState(usData);
      }

      // 9. System Metrics
      const sysData = await fetchJson<SystemMetrics | null>('/api/v1/system/metrics', null);
      if (sysData) {
        setSystemMetrics(sysData);
      }

      // 10. Candles for active symbol
      const candleData = await fetchJson<Candle[]>(`/api/v1/market-data/candles?symbol=${selectedInstrument}&timeframe=5m`, []);
      setCandles(candleData);

      setLatencyMs(Math.round(performance.now() - start));
    } catch (e) {
      console.error('Failed to load platform data:', e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedInstrument]);

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 15000); // 15s poll for telemetry
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // Load candles when symbol changes
  useEffect(() => {
    const fetchCandles = async () => {
      try {
        const res = await fetch(`/api/v1/market-data/candles?symbol=${selectedInstrument}&timeframe=5m`);
        if (res.ok) {
          const data = await res.json();
          setCandles(data);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchCandles();
  }, [selectedInstrument]);

  // Kill Switch Handler
  const handleToggleKillSwitch = async (active: boolean) => {
    try {
      const res = await fetch('/api/v1/risk/kill-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active, reason: 'Manual operator action from platform UI' }),
      });
      if (res.ok) {
        const data = await res.json();
        setKillSwitchActive(data.active);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Mode Change Handler
  const handleModeChange = async (newMode: ApplicationMode) => {
    try {
      const res = await fetch('/api/v1/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode }),
      });
      if (res.ok) {
        const data = await res.json();
        setMode(data.mode);
      } else {
        const err = await res.json();
        alert(err.message || 'Cannot switch mode');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Order preview trigger
  const handlePreviewOrder = async (order: any) => {
    setPendingOrderIntent(order);
    try {
      const res = await fetch('/api/v1/orders/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...order,
          strategyId: 'manual_intent',
          strategyVersion: 'v1',
        }),
      });
      if (res.ok) {
        const decision: RiskDecision = await res.json();
        setActiveRiskDecision(decision);
        setIsPreviewOpen(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Order confirmation execution
  const handleConfirmOrder = async () => {
    if (!pendingOrderIntent) return;
    setIsSubmittingOrder(true);
    try {
      const res = await fetch('/api/v1/orders/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...pendingOrderIntent,
          strategyId: 'manual_intent',
          strategyVersion: 'v1',
        }),
      });
      if (res.ok) {
        const orderResult: OrderResult = await res.json();
        setOrders((prev) => [orderResult, ...prev]);
        setIsPreviewOpen(false);
        fetchAllData();
      } else {
        const err = await res.json();
        alert(`Order rejected: ${err.message || 'Risk engine denial'}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Position emergency exit
  const handleExitPosition = async (symbol: string) => {
    if (!confirm(`Confirm Emergency Market Exit for ${symbol} position?`)) return;
    try {
      const res = await fetch('/api/v1/orders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instrument: symbol, reason: 'Emergency exit from Trade Terminal' }),
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Backtest runner
  const handleRunBacktest = async (params: any) => {
    const res = await fetch('/api/v1/backtests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Backtest execution failed');
    return await res.json();
  };

  // AI Hypothesis Generator
  const handleGenerateHypothesis = async (prompt: string, market: 'CRYPTO_FUTURES' | 'US_EQUITIES') => {
    const res = await fetch('/api/v1/research/hypotheses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, market }),
    });
    if (!res.ok) throw new Error('AI Hypothesis generation failed');
    return await res.json();
  };

  // Continuous Reconciliation Trigger
  const handleReconcile = async () => {
    const res = await fetch('/api/v1/system/reconcile', { method: 'POST' });
    if (!res.ok) throw new Error('Reconciliation failed');
    return await res.json();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-mono selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Platform Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        mode={mode}
        onModeChange={handleModeChange}
        killSwitchActive={killSwitchActive}
        onToggleKillSwitch={handleToggleKillSwitch}
        latencyMs={latencyMs}
        liveTradingEnabledEnv={liveTradingEnabledEnv}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main View Router */}
      <main className="flex-1 overflow-auto">
        {activeTab === 'Overview' && (
          <OverviewView
            mode={mode}
            equity={equity}
            availableMargin={availableMargin}
            unrealizedPnL={unrealizedPnL}
            positions={positions}
            strategies={strategies}
            recentSignals={recentSignals}
            recentOrders={orders}
            killSwitchActive={killSwitchActive}
            onNavigateToTrade={() => setActiveTab('Trade')}
            onNavigateToResearch={() => setActiveTab('Research')}
          />
        )}

        {activeTab === 'Trade' && (
          <TradeView
            instruments={instruments}
            selectedInstrument={selectedInstrument}
            onSelectInstrument={setSelectedInstrument}
            candles={candles}
            positions={positions}
            orders={orders}
            currentSignal={recentSignals.find((s) => s.instrument === selectedInstrument)}
            mode={mode}
            dataSourceMode={dataSourceMode}
            freshnessSec={dataFreshnessSec}
            onTimeframeChange={async (tf) => {
              const candleData = await fetchJson<Candle[]>(`/api/v1/market-data/candles?symbol=${selectedInstrument}&timeframe=${tf}`, []);
              if (candleData.length > 0) setCandles(candleData);
            }}
            onPreviewOrder={handlePreviewOrder}
            onExitPosition={handleExitPosition}
            isLoading={isLoading}
            onRefresh={fetchAllData}
          />
        )}

        {activeTab === 'Research' && (
          <ResearchView
            strategies={strategies}
            onRunBacktest={handleRunBacktest}
            patterns={patterns}
            usMarketState={usMarketState}
            onGenerateHypothesis={handleGenerateHypothesis}
          />
        )}

        {activeTab === 'Strategies' && (
          <StrategiesView strategies={strategies} />
        )}

        {activeTab === 'System' && (
          <SystemView
            metrics={systemMetrics}
            mode={mode}
            killSwitchActive={killSwitchActive}
            onToggleKillSwitch={handleToggleKillSwitch}
            onReconcile={handleReconcile}
          />
        )}
      </main>

      {/* Order Intent Preview & Risk Gate Modal */}
      <OrderPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onConfirm={handleConfirmOrder}
        orderIntent={pendingOrderIntent}
        riskDecision={activeRiskDecision}
        mode={mode}
        isSubmitting={isSubmittingOrder}
      />

      {/* Platform Settings & Governance Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onRefreshParent={fetchAllData}
      />
    </div>
  );
}
