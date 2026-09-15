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

export type SignalDirection = 'LONG' | 'SHORT' | 'FLAT';
export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP_MARKET' | 'TAKE_PROFIT_MARKET';
export type OrderStatus = 'NEW' | 'PENDING_RISK' | 'REJECTED' | 'OPEN' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED' | 'EXPIRED';
export type PositionSide = 'LONG' | 'SHORT' | 'NONE';

export interface Instrument {
  symbol: string;
  pair: string;
  baseCurrency: string;
  quoteCurrency: string;
  settlementCurrency: string;
  contractType: 'PERPETUAL_FUTURES';
  status: 'ACTIVE' | 'DELISTED' | 'MAINTENANCE';
  minQuantity: number;
  maxQuantity: number;
  stepSize: number;
  tickSize: number;
  minNotional: number;
  maxLeverage: number;
  supportedOrderTypes: OrderType[];
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
  timestamp: number; // Unix timestamp in ms
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

export interface FeatureSnapshot {
  [featureName: string]: number;
}

export interface Signal {
  id: string;
  strategyId: string;
  strategyVersion: string;
  instrument: string;
  timestamp: string;
  direction: SignalDirection;
  confidence: number;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  expectedHoldingTime?: number; // in seconds
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
  metricsSnapshot: {
    dailyLoss: number;
    maxDailyLossLimit: number;
    currentDrawdownPercent: number;
    maxDrawdownLimit: number;
    positionNotional: number;
    maxNotionalLimit: number;
    requestedLeverage: number;
    maxLeverageLimit: number;
    concurrentPositions: number;
    maxConcurrentLimit: number;
    marketDataAgeMs: number;
    signalAgeMs: number;
  };
}

export interface OrderIntent {
  id: string;
  clientOrderId: string;
  strategyId: string;
  strategyVersion: string;
  signalId: string;
  instrument: string;
  side: OrderSide;
  quantity: number;
  orderType: OrderType;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  leverage: number;
  marginType: 'ISOLATED' | 'CROSS';
  reduceOnly: boolean;
  createdAt: string;
}

export interface OrderResult {
  id: string;
  clientOrderId: string;
  exchangeOrderId?: string;
  instrument: string;
  side: OrderSide;
  quantity: number;
  executedQuantity: number;
  price?: number;
  avgFillPrice?: number;
  status: OrderStatus;
  fee: number;
  feeCurrency: string;
  createdAt: string;
  updatedAt: string;
  isSimulated: boolean;
}

export interface Position {
  id?: string;
  instrument: string;
  side: PositionSide;
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

export interface WalletBalance {
  currency: string;
  total: number;
  available: number;
  lockedInOrders: number;
  lockedInPositions: number;
  unrealizedPnL: number;
  marginRatio: number;
}

export interface BacktestRequest {
  strategyId: string;
  strategyVersion?: string;
  instrument: string;
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  startDate: string;
  endDate: string;
  startingCapital: number;
  leverage: number;
  makerFeeRate: number;
  takerFeeRate: number;
  slippageModel: 'ZERO' | 'FIXED_BPS' | 'VOLATILITY_SCALED';
  slippageBps: number;
  latencyMs: number;
  positionSizingPct: number;
  parameters: Record<string, unknown>;
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
  exitReason: 'TAKE_PROFIT' | 'STOP_LOSS' | 'SIGNAL_REVERSAL' | 'TIMEOUT' | 'LIQUIDATION';
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
  parameters: Record<string, unknown>;
}

export interface ValidationScorecard {
  strategyId: string;
  strategyVersion: string;
  validationDate?: string;
  overallScore: number; // 0 - 100
  overallStatus?: 'PASS' | 'WARN' | 'FAIL';
  overallVerdict: 'PASS' | 'WARN' | 'FAIL';
  inSampleBacktest?: 'PASS' | 'WARN' | 'FAIL';
  outOfSample?: 'PASS' | 'WARN' | 'FAIL';
  walkForward?: 'PASS' | 'WARN' | 'FAIL';
  parameterStability?: 'PASS' | 'WARN' | 'FAIL';
  monteCarlo?: 'PASS' | 'WARN' | 'FAIL';
  feeStress?: 'PASS' | 'WARN' | 'FAIL';
  slippageStress?: 'PASS' | 'WARN' | 'FAIL';
  regimeStability?: 'PASS' | 'WARN' | 'FAIL';
  sampleSize?: 'PASS' | 'WARN' | 'FAIL';
  checks?: {
    backtestPerformance: 'PASS' | 'WARN' | 'FAIL';
    outOfSampleRobustness: 'PASS' | 'WARN' | 'FAIL';
    walkForwardConsistency: 'PASS' | 'WARN' | 'FAIL';
    parameterStability: 'PASS' | 'WARN' | 'FAIL';
    monteCarloShuffling: 'PASS' | 'WARN' | 'FAIL';
    feeStressTest: 'PASS' | 'WARN' | 'FAIL';
    slippageStressTest: 'PASS' | 'WARN' | 'FAIL';
    regimeStability: 'PASS' | 'WARN' | 'FAIL';
    sampleSizeAdequacy: 'PASS' | 'WARN' | 'FAIL';
  };
  metrics: {
    trainTestRatio?: string | number;
    inSampleSharpe?: number;
    outOfSampleSharpe: number;
    outOfSampleDrawdown?: number;
    monteCarlo95thPercentileDrawdown?: number;
    monteCarlo95VaR?: number;
    walkForwardEfficiency?: number;
    stressMaxDrawdown?: number;
    sampleCount?: number;
    feeDoubleSurvives?: boolean;
    totalEvaluatedTrades?: number;
    parameterSensitivityIndex?: number;
  };
  recommendation?: string;
}

export interface PatternObservation {
  id: string;
  name?: string;
  patternName: string;
  description?: string;
  domain?: 'CRYPTO' | 'US_EQUITIES';
  market: 'CRYPTO_FUTURES' | 'US_EQUITIES';
  occurrenceCount?: number;
  sampleCount: number;
  meanForwardReturnPercent?: number;
  medianForwardReturnPercent?: number;
  forwardReturn15m?: number;
  forwardReturn60m?: number;
  forwardReturn240m?: number;
  winRate?: number;
  winRatePercent: number;
  expectedValue: number;
  confidenceInterval95: [number, number];
  volatility?: number;
  volatilityPercent?: number;
  regimeDependency: string;
  timeOfDayDependency: string;
  failureRate?: number;
  failureRatePercent?: number;
  sampleStatus?: 'VALID_SAMPLE' | 'INSUFFICIENT_SAMPLE';
  recommendedAction: string;
}

export interface NewsEvent {
  id: string;
  timestamp: string;
  source: string;
  sourceUrl?: string;
  symbol?: string;
  market?: 'CRYPTO' | 'US_EQUITIES';
  eventType: string;
  headline: string;
  summary: string;
  sentiment: number; // -1.0 to 1.0
  severity: number;  // 1 to 5
  confidence: number; // 0 to 1
  novelty: number;   // 0 to 1
  materialityScore?: number;
}

export interface StrategyDefinition {
  id: string;
  name: string;
  version: string;
  market: 'CRYPTO_FUTURES' | 'US_EQUITIES';
  timeframe: string;
  instrument: string;
  lifecycleStatus: StrategyLifecycleStatus;
  validationScore?: number;
  outOfSampleScore?: number;
  maxDrawdownPercent?: number;
  sharpeRatio?: number;
  winRatePercent?: number;
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'WARNING';
  parameters: Record<string, unknown>;
  requiredFeatures: string[];
  description: string;
  author: string;
  createdAt?: string;
  updatedAt?: string;
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
  result: 'SUCCESS' | 'FAILURE' | 'BLOCKED' | 'DENIED' | 'ACTIVATED' | 'DISARMED' | 'FAILED' | 'EXITED' | 'PARTIALLY_EXITED';
  metadata: Record<string, unknown>;
}

export interface ResearchHypothesis {
  id: string;
  title: string;
  hypothesis: string;
  market: 'CRYPTO_FUTURES' | 'US_EQUITIES' | 'CROSS_MARKET';
  evidence?: string[];
  observedFacts: string[];
  inferences: string[];
  features: string[];
  entryConditions: string[];
  exitConditions: string[];
  invalidatingConditions: string[];
  confidence: number;
  recommendedExperiment: string;
  status: 'PROPOSED' | 'BACKTESTED' | 'VALIDATED' | 'REJECTED';
  createdAt: string;
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
  currentStructure: 'HIGHER_HIGH' | 'LOWER_LOW' | 'HIGHER_LOW' | 'LOWER_HIGH' | 'BREAKOUT' | 'BREAKDOWN' | 'REVERSAL' | 'CONSOLIDATION';
  vwapRelationship: 'ABOVE_VWAP' | 'BELOW_VWAP' | 'AT_VWAP';
  hypothesisEvaluation: {
    impulseDetected: boolean;
    retracementConfirmed: boolean;
    structureConfirmed: boolean;
    patternType: 'CONTINUATION_LONG' | 'CONTINUATION_SHORT' | 'REVERSAL_LONG' | 'REVERSAL_SHORT' | 'NONE';
    statisticalSignificancePValue: number;
    researchVerdict: string;
  };
}

export interface SystemHealthMetrics {
  coinDcxStatus: 'CONNECTED' | 'DEGRADED' | 'DISCONNECTED';
  coinDcxLatencyMs: number;
  apiLatencyMs: number;
  marketDataStatus: 'HEALTHY' | 'STALE' | 'GAP_DETECTED';
  marketDataFreshnessSec: number;
  databaseStatus: 'CONNECTED' | 'EMBEDDED_ACTIVE';
  redisQueueStatus: 'RUNNING' | 'EMBEDDED_WORKER';
  workerJobsPending: number;
  errorRateLastHour: number;
  globalKillSwitchActive: boolean;
  liveTradingEnabled: boolean;
  mode: ApplicationMode;
}
