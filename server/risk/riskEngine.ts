import { 
  OrderIntent, 
  RiskDecision, 
  ApplicationMode, 
  Instrument, 
  Position, 
  Signal, 
  StrategyLifecycleStatus 
} from '../types/quant.ts';
import { appConfig, configManager } from '../config/appConfig.ts';

export interface RiskEngineConfig {
  maxDailyLoss: number; // USDT
  maxDrawdownPercent: number; // %
  maxPositionNotional: number; // USDT
  maxLeverage: number;
  maxConcurrentPositions: number;
  maxOrderRatePerMinute: number;
  maxSignalAgeSeconds: number;
  maxMarketDataAgeSeconds: number;
}

export class RiskEngine {
  private config: RiskEngineConfig;
  private isKillSwitchActive: boolean = false;
  private mode: ApplicationMode = 'RESEARCH';
  private recentOrderTimestamps: number[] = [];
  private dailyLossAccumulated: number = 0;
  private peakEquity: number = 25000;
  private currentEquity: number = 25000;
  private storedDecisions: RiskDecision[] = [];

  constructor(config?: Partial<RiskEngineConfig>) {
    this.config = {
      maxDailyLoss: appConfig.risk.maxDailyLoss,
      maxDrawdownPercent: 10.0,
      maxPositionNotional: appConfig.risk.maxPositionNotional,
      maxLeverage: appConfig.risk.maxLeverage,
      maxConcurrentPositions: appConfig.risk.maxConcurrentPositions,
      maxOrderRatePerMinute: appConfig.risk.maxOrderRatePerMinute,
      maxSignalAgeSeconds: appConfig.risk.maxSignalAgeSeconds,
      maxMarketDataAgeSeconds: appConfig.risk.maxMarketDataAgeSeconds,
      ...config,
    };
  }

  public getConfig(): RiskEngineConfig & { isDevelopmentDefault: boolean } {
    return {
      ...this.config,
      isDevelopmentDefault: appConfig.risk.isDevelopmentDefault,
    };
  }

  public updateConfig(updates: Partial<RiskEngineConfig>): RiskEngineConfig {
    this.config = {
      ...this.config,
      ...updates,
    };
    configManager.updateRiskConfig(updates);
    return this.config;
  }

  public setKillSwitch(active: boolean, reason?: string): void {
    this.isKillSwitchActive = active;
    console.warn(`[Risk Engine] Global Kill Switch state changed: ${active ? 'ACTIVATED' : 'DISARMED'} - Reason: ${reason || 'User manual action'}`);
  }

  public getKillSwitch(): boolean {
    return this.isKillSwitchActive;
  }

  public setMode(mode: ApplicationMode): void {
    this.mode = mode;
  }

  public getMode(): ApplicationMode {
    return this.mode;
  }

  public getRecentDecisions(limit: number = 20): RiskDecision[] {
    return this.storedDecisions.slice(-limit).reverse();
  }

  /**
   * Evaluates order intent against all strict risk gates.
   */
  public evaluate(
    intent: OrderIntent,
    signal: Signal | undefined,
    instrument: Instrument | undefined,
    openPositions: Position[],
    strategyStatus: StrategyLifecycleStatus = 'ACTIVE'
  ): RiskDecision {
    const checksPassed: string[] = [];
    const checksFailed: string[] = [];
    const reasons: string[] = [];
    const now = Date.now();

    // 1. Global Kill Switch check
    if (this.isKillSwitchActive) {
      checksFailed.push('KILL_SWITCH_ACTIVE');
      reasons.push('Global Kill Switch is active. All order submissions are blocked.');
    } else {
      checksPassed.push('KILL_SWITCH_INACTIVE');
    }

    // 2. Trading Mode Gate check
    if (this.mode === 'RESEARCH' || this.mode === 'BACKTEST' || this.mode === 'LIVE_DISABLED') {
      checksFailed.push('INVALID_MODE_FOR_EXECUTION');
      reasons.push(`Current application mode is ${this.mode}. Orders cannot be executed in this mode.`);
    } else {
      checksPassed.push('VALID_TRADING_MODE');
    }

    // 3. Strategy Lifecycle Gate check
    if (strategyStatus === 'DEGRADED' || strategyStatus === 'RETIRED') {
      checksFailed.push('STRATEGY_DEGRADED_OR_RETIRED');
      reasons.push(`Strategy status is ${strategyStatus}. Orders blocked from unapproved strategies.`);
    } else {
      checksPassed.push('STRATEGY_STATUS_APPROVED');
    }

    // 4. Instrument Availability & Status check
    if (!instrument || instrument.status !== 'ACTIVE') {
      checksFailed.push('INSTRUMENT_NOT_ACTIVE');
      reasons.push(`Instrument ${intent.instrument} is not active for futures trading.`);
    } else {
      checksPassed.push('INSTRUMENT_ACTIVE');
    }

    // 5. Market Data Freshness check
    const instrumentAgeSec = instrument ? (now - new Date(instrument.lastUpdated).getTime()) / 1000 : 999;
    if (instrumentAgeSec > this.config.maxMarketDataAgeSeconds) {
      checksFailed.push('MARKET_DATA_STALE');
      reasons.push(`Market data for ${intent.instrument} is ${Math.round(instrumentAgeSec)}s old (limit: ${this.config.maxMarketDataAgeSeconds}s).`);
    } else {
      checksPassed.push('MARKET_DATA_FRESH');
    }

    // 6. Signal Freshness check
    if (signal) {
      const signalAgeSec = (now - new Date(signal.timestamp).getTime()) / 1000;
      if (signalAgeSec > this.config.maxSignalAgeSeconds) {
        checksFailed.push('SIGNAL_STALE');
        reasons.push(`Signal is ${Math.round(signalAgeSec)}s old (max allowed: ${this.config.maxSignalAgeSeconds}s).`);
      } else {
        checksPassed.push('SIGNAL_FRESH');
      }
    }

    // 7. Notional & Position Size check
    const price = intent.price || instrument?.currentPrice || 0;
    const notional = intent.quantity * price;
    if (notional > this.config.maxPositionNotional) {
      checksFailed.push('MAX_NOTIONAL_EXCEEDED');
      reasons.push(`Order notional ($${Math.round(notional)}) exceeds maximum allowed notional ($${this.config.maxPositionNotional}).`);
    } else if (instrument && notional < instrument.minNotional) {
      checksFailed.push('BELOW_MIN_NOTIONAL');
      reasons.push(`Order notional ($${notional.toFixed(2)}) is below exchange minimum notional ($${instrument.minNotional}).`);
    } else {
      checksPassed.push('NOTIONAL_WITHIN_LIMITS');
    }

    // 8. Leverage check
    if (intent.leverage > this.config.maxLeverage) {
      checksFailed.push('MAX_LEVERAGE_EXCEEDED');
      reasons.push(`Requested leverage ${intent.leverage}x exceeds risk limit ${this.config.maxLeverage}x.`);
    } else if (instrument && intent.leverage > instrument.maxLeverage) {
      checksFailed.push('EXCHANGE_MAX_LEVERAGE_EXCEEDED');
      reasons.push(`Requested leverage ${intent.leverage}x exceeds instrument max leverage ${instrument.maxLeverage}x.`);
    } else {
      checksPassed.push('LEVERAGE_WITHIN_LIMITS');
    }

    // 9. Concurrent Positions check
    const currentPositionsCount = openPositions.length;
    const isAlreadyInInstrument = openPositions.some(p => p.instrument === intent.instrument);
    if (!isAlreadyInInstrument && currentPositionsCount >= this.config.maxConcurrentPositions) {
      checksFailed.push('MAX_CONCURRENT_POSITIONS_EXCEEDED');
      reasons.push(`Active positions count (${currentPositionsCount}) reached maximum concurrent limit (${this.config.maxConcurrentPositions}).`);
    } else {
      checksPassed.push('CONCURRENT_POSITIONS_WITHIN_LIMITS');
    }

    // 10. Daily Loss and Drawdown check
    const currentDrawdownPct = this.peakEquity > 0 ? ((this.peakEquity - this.currentEquity) / this.peakEquity) * 100 : 0;
    if (this.dailyLossAccumulated >= this.config.maxDailyLoss) {
      checksFailed.push('MAX_DAILY_LOSS_EXCEEDED');
      reasons.push(`Accumulated daily loss ($${this.dailyLossAccumulated}) has breached daily loss limit ($${this.config.maxDailyLoss}).`);
    } else if (currentDrawdownPct >= this.config.maxDrawdownPercent) {
      checksFailed.push('MAX_DRAWDOWN_EXCEEDED');
      reasons.push(`Current drawdown (${currentDrawdownPct.toFixed(1)}%) has breached drawdown limit (${this.config.maxDrawdownPercent}%).`);
    } else {
      checksPassed.push('LOSS_AND_DRAWDOWN_WITHIN_LIMITS');
    }

    // 11. Order Rate / Throttle check
    const oneMinuteAgo = now - 60000;
    this.recentOrderTimestamps = this.recentOrderTimestamps.filter(t => t > oneMinuteAgo);
    if (this.recentOrderTimestamps.length >= this.config.maxOrderRatePerMinute) {
      checksFailed.push('ORDER_RATE_EXCEEDED');
      reasons.push(`Order rate limit (${this.config.maxOrderRatePerMinute} orders/min) exceeded.`);
    } else {
      checksPassed.push('ORDER_RATE_WITHIN_LIMITS');
      this.recentOrderTimestamps.push(now);
    }

    // 12. Price & Quantity Sanity check
    if (intent.quantity <= 0 || isNaN(intent.quantity)) {
      checksFailed.push('INVALID_QUANTITY');
      reasons.push('Order quantity must be positive.');
    } else if (instrument && (intent.quantity < instrument.minQuantity || intent.quantity > instrument.maxQuantity)) {
      checksFailed.push('QUANTITY_OUT_OF_BOUNDS');
      reasons.push(`Quantity ${intent.quantity} out of allowed bounds [${instrument.minQuantity}, ${instrument.maxQuantity}].`);
    } else {
      checksPassed.push('QUANTITY_SANITY_PASSED');
    }

    // Final Decision Status
    let status: 'ALLOW' | 'DENY' | 'REQUIRE_CONFIRMATION' = 'ALLOW';
    if (checksFailed.length > 0) {
      status = 'DENY';
    } else if (this.mode === 'LIVE_ARMED') {
      status = 'REQUIRE_CONFIRMATION';
      reasons.push('Live Armed mode requires explicit single-order operator confirmation.');
    }

    const decision: RiskDecision = {
      id: `risk-${now}-${Math.floor(Math.random() * 1000)}`,
      orderIntentId: intent.id,
      timestamp: new Date(now).toISOString(),
      status,
      reasons,
      checksPassed,
      checksFailed,
      metricsSnapshot: {
        dailyLoss: this.dailyLossAccumulated,
        maxDailyLossLimit: this.config.maxDailyLoss,
        currentDrawdownPercent: currentDrawdownPct,
        maxDrawdownLimit: this.config.maxDrawdownPercent,
        positionNotional: notional,
        maxNotionalLimit: this.config.maxPositionNotional,
        requestedLeverage: intent.leverage,
        maxLeverageLimit: this.config.maxLeverage,
        concurrentPositions: currentPositionsCount,
        maxConcurrentLimit: this.config.maxConcurrentPositions,
        marketDataAgeMs: Math.round(instrumentAgeSec * 1000),
        signalAgeMs: signal ? Math.round((now - new Date(signal.timestamp).getTime())) : 0,
      },
    };

    this.storedDecisions.push(decision);
    return decision;
  }
}
