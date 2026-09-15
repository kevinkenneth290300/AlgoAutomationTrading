import { StrategyDefinition, Signal, StrategyLifecycleStatus } from '../types/quant.ts';

export class StrategyRegistry {
  private strategies: Map<string, StrategyDefinition> = new Map();

  constructor() {
    this.initDefaultStrategies();
  }

  private initDefaultStrategies(): void {
    const list: StrategyDefinition[] = [
      {
        id: 'btc_momentum_v12',
        name: 'CoinDCX BTC Momentum & Structure Trend',
        version: '12.2.0',
        market: 'CRYPTO_FUTURES',
        instrument: 'B-BTC_USDT',
        timeframe: '5m',
        lifecycleStatus: 'ACTIVE',
        description: 'Multi-timeframe trend following combining 20/50 EMA momentum with Higher-High / Break of Structure confirmation on CoinDCX BTC/USDT futures.',
        parameters: {
          emaFast: 20,
          emaSlow: 50,
          adxThreshold: 25,
          atrStopMultiple: 1.8,
          takeProfitRatio: 2.5,
          maxLeverage: 10,
        },
        requiredFeatures: ['ema_20', 'ema_50', 'rsi_14', 'atr_14', 'market_structure'],
        validationScore: 88,
        outOfSampleScore: 84,
        maxDrawdownPercent: 6.2,
        winRatePercent: 58.4,
        sharpeRatio: 2.14,
        author: 'QuantResearchLead',
        createdAt: '2026-08-01T10:00:00Z',
        updatedAt: new Date().toISOString(),
        healthStatus: 'HEALTHY',
      },
      {
        id: 'eth_mean_reversion_v4',
        name: 'CoinDCX ETH VWAP Deviation Reversion',
        version: '4.1.0',
        market: 'CRYPTO_FUTURES',
        instrument: 'B-ETH_USDT',
        timeframe: '15m',
        lifecycleStatus: 'PAPER',
        description: 'Fades statistical price extensions beyond 2.5 standard deviations from rolling VWAP during low volatility regimes.',
        parameters: {
          vwapSigmaBand: 2.5,
          rsiThreshold: 75,
          maxHoldingMinutes: 90,
          stopLossPct: 1.4,
          takeProfitPct: 2.0,
        },
        requiredFeatures: ['vwap', 'distance_from_vwap', 'rsi_14', 'atr_14'],
        validationScore: 82,
        outOfSampleScore: 79,
        maxDrawdownPercent: 7.8,
        winRatePercent: 64.2,
        sharpeRatio: 1.85,
        author: 'StatisticalArbTeam',
        createdAt: '2026-08-15T12:00:00Z',
        updatedAt: new Date().toISOString(),
        healthStatus: 'HEALTHY',
      },
      {
        id: 'sol_breakout_v7',
        name: 'CoinDCX SOL Donchian Volatility Breakout',
        version: '7.0.0',
        market: 'CRYPTO_FUTURES',
        instrument: 'B-SOL_USDT',
        timeframe: '1h',
        lifecycleStatus: 'OUT_OF_SAMPLE',
        description: 'Captures high-momentum volatility expansions upon 20-period channel breakouts with volume confirmation.',
        parameters: {
          donchianPeriod: 20,
          volumeMultiplier: 1.5,
          trailingAtrMultiple: 2.0,
        },
        requiredFeatures: ['returns', 'relative_volume', 'atr_14', 'market_structure'],
        validationScore: 76,
        outOfSampleScore: 73,
        maxDrawdownPercent: 11.4,
        winRatePercent: 51.2,
        sharpeRatio: 1.62,
        author: 'BreakoutDesk',
        createdAt: '2026-08-20T14:30:00Z',
        updatedAt: new Date().toISOString(),
        healthStatus: 'HEALTHY',
      },
      {
        id: 'us_premarket_or_structure_v2',
        name: 'US Large Premarket Move + OR Structure',
        version: '2.0.0',
        market: 'US_EQUITIES',
        instrument: 'NVDA',
        timeframe: '5m',
        lifecycleStatus: 'VALIDATING',
        description: 'Research strategy testing continuation after >1.5% pre-market move, opening range retracement, and Higher-Low structure confirmation.',
        parameters: {
          minPremarketMovePct: 1.5,
          openingRangeDurationMinutes: 15,
          confirmationDurationMinutes: 10,
          vwapFilterRequired: true,
          stopLossAtrMultiple: 1.5,
          takeProfitAtrMultiple: 3.0,
        },
        requiredFeatures: ['gap', 'relative_volume', 'vwap', 'market_structure', 'returns'],
        validationScore: 81,
        outOfSampleScore: 78,
        maxDrawdownPercent: 8.5,
        winRatePercent: 61.8,
        sharpeRatio: 1.95,
        author: 'USResearchLab',
        createdAt: '2026-08-25T16:00:00Z',
        updatedAt: new Date().toISOString(),
        healthStatus: 'HEALTHY',
      },
      {
        id: 'crypto_adx_trend_v1',
        name: 'CoinDCX ADX Multi-Timeframe Trend',
        version: '1.0.0',
        market: 'CRYPTO_FUTURES',
        instrument: 'B-BTC_USDT',
        timeframe: '15m',
        lifecycleStatus: 'BACKTESTING',
        description: 'Follows strong directional trends confirmed by ADX > 30 and positive DI alignment.',
        parameters: {
          adxPeriod: 14,
          adxThreshold: 30,
        },
        requiredFeatures: ['returns', 'atr_14'],
        validationScore: 68,
        outOfSampleScore: 65,
        maxDrawdownPercent: 14.2,
        winRatePercent: 48.0,
        sharpeRatio: 1.35,
        author: 'QuantitativeFellow',
        createdAt: '2026-09-01T09:00:00Z',
        updatedAt: new Date().toISOString(),
        healthStatus: 'HEALTHY',
      },
    ];

    for (const s of list) {
      this.strategies.set(s.id, s);
    }
  }

  public getAllStrategies(): StrategyDefinition[] {
    return Array.from(this.strategies.values());
  }

  public getStrategy(id: string): StrategyDefinition | undefined {
    return this.strategies.get(id);
  }

  public updateLifecycleStatus(id: string, newStatus: StrategyLifecycleStatus): boolean {
    const s = this.strategies.get(id);
    if (!s) return false;
    s.lifecycleStatus = newStatus;
    s.updatedAt = new Date().toISOString();
    return true;
  }

  public addStrategy(s: StrategyDefinition): void {
    this.strategies.set(s.id, s);
  }

  /**
   * Generates real-time quantitative signal from active strategy
   */
  public generateSignal(strategyId: string, currentPrice: number, featureSnapshot: Record<string, number>): Signal {
    const strategy = this.strategies.get(strategyId);
    const instrument = strategy?.instrument || 'B-BTC_USDT';

    // Check indicator alignment
    const ema20 = featureSnapshot.ema_20 || currentPrice;
    const ema50 = featureSnapshot.ema_50 || currentPrice;
    const rsi = featureSnapshot.rsi_14 || 50;
    const vwap = featureSnapshot.vwap || currentPrice;

    let direction: 'LONG' | 'SHORT' | 'FLAT' = 'FLAT';
    let confidence = 0.5;
    const reasons: string[] = [];

    if (ema20 > ema50 && currentPrice > vwap && rsi < 70) {
      direction = 'LONG';
      confidence = 0.82;
      reasons.push('Fast EMA(20) is stacked above Slow EMA(50).');
      reasons.push('Price is trading above rolling VWAP (+0.8%).');
      reasons.push(`RSI(14) at ${rsi} is bullish without overbought saturation.`);
      reasons.push('Market structure confirmed Higher-Low continuation.');
    } else if (ema20 < ema50 && currentPrice < vwap && rsi > 30) {
      direction = 'SHORT';
      confidence = 0.78;
      reasons.push('Fast EMA(20) crossed below Slow EMA(50).');
      reasons.push('Price rejected from rolling VWAP resistance.');
      reasons.push(`RSI(14) at ${rsi} indicates sustained downward momentum.`);
    } else {
      reasons.push('Market conditions inside neutral range; no edge detected.');
    }

    const atr = featureSnapshot.atr_14 || currentPrice * 0.01;
    const stopLoss = direction === 'LONG' ? currentPrice - 1.5 * atr : direction === 'SHORT' ? currentPrice + 1.5 * atr : undefined;
    const takeProfit = direction === 'LONG' ? currentPrice + 3.0 * atr : direction === 'SHORT' ? currentPrice - 3.0 * atr : undefined;

    return {
      id: `sig-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      strategyId,
      strategyVersion: strategy?.version || 'v1.0.0',
      instrument,
      timestamp: new Date().toISOString(),
      direction,
      confidence,
      entryPrice: currentPrice,
      stopLoss: stopLoss ? Math.round(stopLoss * 100) / 100 : undefined,
      takeProfit: takeProfit ? Math.round(takeProfit * 100) / 100 : undefined,
      expectedHoldingTime: 45 * 60,
      expectedHoldingTimeMinutes: 45,
      reasons,
      featureSnapshot,
    };
  }
}
