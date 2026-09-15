export type NavigationTab = 'Overview' | 'Trade' | 'Research' | 'Strategies' | 'System';

export type DataSourceMode = 'REAL' | 'MOCK';
export type DataProvenance = 'REAL' | 'PAPER' | 'BACKTEST' | 'MOCK' | 'CALCULATED';

export type ApplicationMode = 
  | 'RESEARCH' 
  | 'BACKTEST' 
  | 'PAPER' 
  | 'LIVE_DISABLED' 
  | 'LIVE_ARMED' 
  | 'LIVE';

export type StrategyLifecycleStatus = 
  | 'DISCOVERED'
  | 'BACKTESTING'
  | 'VALIDATING'
  | 'OUT_OF_SAMPLE'
  | 'PAPER'
  | 'APPROVED'
  | 'ACTIVE'
  | 'DEGRADED'
  | 'RETIRED'
  | 'RESEARCHING';

export interface Instrument {
  symbol: string;
  pair: string;
  baseCurrency: string;
  quoteCurrency: string;
  settlementCurrency: string;
  contractType: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DELISTED';
  minQuantity: number;
  maxQuantity: number;
  stepSize: number;
  tickSize: number;
  minNotional: number;
  maxLeverage: number;
  supportedOrderTypes: string[];
  makerFeeRate: number;
  takerFeeRate: number;
  currentPrice: number;
  markPrice: number;
  indexPrice: number;
  fundingRate: number;
  nextFundingTime: string;
  openInterest: number;
  volume24h: number;
  priceChange24h: number;
  high24h: number;
  low24h: number;
  lastUpdated: string;
  provenance?: DataProvenance;
}

export interface Candle {
  timestamp: number;
  timeISO: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  trades?: number;
  vwap?: number;
  ema20?: number | null;
  ema50?: number | null;
  sma20?: number | null;
  rsi14?: number | null;
  atr14?: number | null;
}

export interface OrderBook {
  symbol: string;
  timestamp: number;
  bids: [number, number][]; // [price, size]
  asks: [number, number][];
  spread: number;
  provenance: DataProvenance;
}

export interface MarketFreshness {
  lastExchangeEventAt: number;
  freshnessMs: number;
  isFresh: boolean;
  status: 'FRESH' | 'STALE' | 'DISCONNECTED';
  source: string;
}

export interface Position {
  id?: string;
  instrument: string;
  side: 'LONG' | 'SHORT';
  quantity?: number;
  size?: number;
  entryPrice: number;
  markPrice: number;
  liquidationPrice: number;
  leverage: number;
  margin: number;
  notional?: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL: number;
  stopLoss?: number;
  takeProfit?: number;
  updatedAt: string;
  isSimulated?: boolean;
  provenance?: DataProvenance;
}

export interface PaperAccountSummary {
  initialCapital: number;
  cashBalance: number;
  unrealizedPnL: number;
  realizedPnL: number;
  equity: number;
  availableMargin: number;
  marginUsed: number;
  todayRealizedPnL: number;
  todayDrawdownPercent: number;
  peakEquityToday: number;
  positions: Position[];
  orders: OrderResult[];
  lastUpdated: string;
}

export interface Signal {
  id: string;
  strategyId: string;
  strategyVersion: string;
  instrument: string;
  timestamp: string;
  direction: 'LONG' | 'SHORT' | 'FLAT';
  confidence: number;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  expectedHoldingTimeMinutes?: number;
  reasons: string[];
  featureSnapshot: Record<string, number>;
}

export interface RiskDecision {
  id: string;
  orderIntentId: string;
  timestamp: string;
  status: 'ALLOW' | 'DENY' | 'REQUIRE_CONFIRMATION';
  reasons: string[];
  checksPassed: string[];
  checksFailed: string[];
  metricsSnapshot: Record<string, number>;
}

export interface OrderResult {
  id: string;
  clientOrderId: string;
  exchangeOrderId?: string;
  instrument: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  executedQuantity: number;
  price?: number;
  avgFillPrice?: number;
  status: 'OPEN' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED' | 'REJECTED';
  fee: number;
  feeCurrency: string;
  createdAt: string;
  updatedAt: string;
  isSimulated: boolean;
}

export interface StrategyDefinition {
  id: string;
  name: string;
  version: string;
  market: 'CRYPTO_FUTURES' | 'US_EQUITIES' | 'CROSS_MARKET';
  instrument: string;
  timeframe: string;
  lifecycleStatus: StrategyLifecycleStatus;
  description: string;
  parameters: Record<string, any>;
  requiredFeatures: string[];
  validationScore?: number;
  outOfSampleScore?: number;
  maxDrawdownPercent?: number;
  winRatePercent?: number;
  sharpeRatio?: number;
  author: string;
  createdAt: string;
  updatedAt: string;
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
}

export interface BacktestTrade {
  id: string;
  tradeNumber: number;
  entryTime: string;
  exitTime: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  commission: number;
  slippage: number;
  holdingPeriodMinutes: number;
  exitReason: 'TAKE_PROFIT' | 'STOP_LOSS' | 'SIGNAL_REVERSAL' | 'TIME_LIMIT';
}

export interface BacktestResult {
  id: string;
  strategyId: string;
  strategyName: string;
  strategyVersion: string;
  instrument: string;
  timeframe: string;
  startDate: string;
  endDate: string;
  runAt: string;
  startingCapital: number;
  endingCapital: number;
  netProfit: number;
  totalReturnPercent: number;
  cagr: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdownPercent: number;
  maxDrawdownDurationDays: number;
  profitFactor: number;
  expectancy: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  averageWin: number;
  averageLoss: number;
  winLossRatio: number;
  worstTradePercent: number;
  maxConsecutiveLosses: number;
  totalFeesPaid: number;
  totalSlippageCost: number;
  equityCurve: { timestamp: string; equity: number; drawdownPercent: number }[];
  trades: BacktestTrade[];
  parameters: Record<string, any>;
}

export interface ValidationScorecard {
  strategyId: string;
  strategyVersion: string;
  validationDate: string;
  overallScore: number;
  overallVerdict: 'PASS' | 'WARN' | 'FAIL';
  inSampleBacktest: 'PASS' | 'WARN' | 'FAIL';
  outOfSample: 'PASS' | 'WARN' | 'FAIL';
  walkForward: 'PASS' | 'WARN' | 'FAIL';
  parameterStability: 'PASS' | 'WARN' | 'FAIL';
  monteCarlo: 'PASS' | 'WARN' | 'FAIL';
  feeStress: 'PASS' | 'WARN' | 'FAIL';
  slippageStress: 'PASS' | 'WARN' | 'FAIL';
  regimeStability: 'PASS' | 'WARN' | 'FAIL';
  sampleSize: 'PASS' | 'WARN' | 'FAIL';
  metrics: {
    trainTestRatio: string;
    outOfSampleSharpe: number;
    outOfSampleDrawdown: number;
    monteCarlo95thPercentileDrawdown: number;
    feeDoubleSurvives: boolean;
    totalEvaluatedTrades: number;
  };
}

export interface PatternObservation {
  id: string;
  patternName: string;
  market: 'CRYPTO_FUTURES' | 'US_EQUITIES';
  sampleCount: number;
  meanForwardReturnPercent: number;
  medianForwardReturnPercent: number;
  winRatePercent: number;
  expectedValue: number;
  confidenceInterval95: [number, number];
  volatilityPercent: number;
  regimeDependency: string;
  timeOfDayDependency: string;
  failureRatePercent: number;
  recommendedAction: string;
}

export interface UsMarketPreMarketHypothesisState {
  symbol: string;
  date: string;
  sessionTimeNy: string;
  sessionTimeIst: string;
  previousClose: number;
  preMarketHigh: number;
  preMarketLow: number;
  preMarketVolume: number;
  gapPercent: number;
  relativeVolume: number;
  regularOpenPrice: number;
  first5mReturn: number;
  first15mReturn: number;
  first30mReturn: number;
  openingRangeHigh: number;
  openingRangeLow: number;
  currentStructure: string;
  vwapRelationship: string;
  hypothesisEvaluation: {
    impulseDetected: boolean;
    retracementConfirmed: boolean;
    structureConfirmed: boolean;
    patternType: string;
    statisticalSignificancePValue: number;
    researchVerdict: string;
  };
}

export interface NewsEvent {
  id: string;
  timestamp: string;
  source: string;
  symbol?: string;
  eventType: string;
  headline: string;
  summary: string;
  sentiment: number;
  severity: number;
  confidence: number;
  novelty: number;
  materialityScore: number;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  requestId?: string;
  correlationId?: string;
  result: 'SUCCESS' | 'FAILURE' | 'DENIED' | 'ACTIVATED' | 'DISARMED';
  metadata: Record<string, any>;
}

export interface SystemMetrics {
  exchangeLatencyMs: number;
  apiLatencyMs: number;
  dataFreshnessSec: number;
  queueDepth: number;
  workerStatus: 'IDLE' | 'BUSY' | 'STOPPED';
  errorRatePercent: number;
  uptimeSeconds: number;
}
