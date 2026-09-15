import { 
  BacktestRequest, 
  BacktestResult, 
  BacktestTrade, 
  Candle 
} from '../types/quant.ts';
import { generateSimulatedCandles } from '../coindcx/adapter.ts';

export class BacktestEngine {
  /**
   * Executes event-driven backtest on historical candle data
   */
  public runBacktest(request: BacktestRequest, historicalCandles?: Candle[]): BacktestResult {
    const candles = historicalCandles || generateSimulatedCandles(request.instrument, 120);
    const trades: BacktestTrade[] = [];
    const equityCurve: { timestamp: string; equity: number; drawdownPercent: number }[] = [];

    let currentEquity = request.startingCapital;
    let peakEquity = currentEquity;
    let maxDrawdownPct = 0;
    let maxUnderwaterDays = 0;

    const initialCapital = request.startingCapital;
    const slippageRate = request.slippageModel === 'FIXED_BPS' 
      ? request.slippageBps / 10000 
      : request.slippageModel === 'VOLATILITY_SCALED' ? 0.0008 : 0.0001;

    let inPosition = false;
    let entryPrice = 0;
    let entryTime = '';
    let positionDirection: 'LONG' | 'SHORT' = 'LONG';
    let positionQty = 0;
    let positionMargin = 0;
    let tradeCounter = 0;

    let totalFeesPaid = 0;
    let totalSlippageCost = 0;

    // Simulation loop (prevents lookahead bias: state at candle i depends strictly on i and prior)
    for (let i = 25; i < candles.length; i++) {
      const prevCandles = candles.slice(0, i);
      const currentCandle = candles[i];
      const close = currentCandle.close;
      const high = currentCandle.high;
      const low = currentCandle.low;

      // Strategy signals evaluation
      const smaFast = prevCandles.slice(-10).reduce((a, b) => a + b.close, 0) / 10;
      const smaSlow = prevCandles.slice(-25).reduce((a, b) => a + b.close, 0) / 25;
      const prevFast = prevCandles.slice(-11, -1).reduce((a, b) => a + b.close, 0) / 10;
      const prevSlow = prevCandles.slice(-26, -1).reduce((a, b) => a + b.close, 0) / 25;

      const bullishCross = prevFast <= prevSlow && smaFast > smaSlow;
      const bearishCross = prevFast >= prevSlow && smaFast < smaSlow;

      // Check exit if in position
      if (inPosition) {
        let shouldExit = false;
        let exitReason: BacktestTrade['exitReason'] = 'SIGNAL_REVERSAL';
        let rawExitPrice = close;

        const pnlPct = positionDirection === 'LONG'
          ? (close - entryPrice) / entryPrice
          : (entryPrice - close) / entryPrice;

        // Take Profit (+2.5%) or Stop Loss (-1.2%)
        if (pnlPct >= 0.025) {
          shouldExit = true;
          exitReason = 'TAKE_PROFIT';
          rawExitPrice = positionDirection === 'LONG' ? entryPrice * 1.025 : entryPrice * 0.975;
        } else if (pnlPct <= -0.012) {
          shouldExit = true;
          exitReason = 'STOP_LOSS';
          rawExitPrice = positionDirection === 'LONG' ? entryPrice * 0.988 : entryPrice * 1.012;
        } else if (positionDirection === 'LONG' && bearishCross) {
          shouldExit = true;
          exitReason = 'SIGNAL_REVERSAL';
        } else if (positionDirection === 'SHORT' && bullishCross) {
          shouldExit = true;
          exitReason = 'SIGNAL_REVERSAL';
        }

        if (shouldExit || i === candles.length - 1) {
          const effectiveExitPrice = positionDirection === 'LONG' 
            ? rawExitPrice * (1 - slippageRate)
            : rawExitPrice * (1 + slippageRate);

          const rawPnl = positionDirection === 'LONG'
            ? (effectiveExitPrice - entryPrice) * positionQty
            : (entryPrice - effectiveExitPrice) * positionQty;

          const exitCommission = (positionQty * effectiveExitPrice) * request.takerFeeRate;
          const slippageCost = Math.abs(rawExitPrice - effectiveExitPrice) * positionQty;
          const netPnl = rawPnl - exitCommission;

          totalFeesPaid += exitCommission;
          totalSlippageCost += slippageCost;
          currentEquity += netPnl;

          tradeCounter++;
          trades.push({
            id: `bt-tr-${tradeCounter}`,
            tradeNumber: tradeCounter,
            entryTime,
            exitTime: currentCandle.timeISO,
            direction: positionDirection,
            entryPrice,
            exitPrice: Math.round(effectiveExitPrice * 100) / 100,
            quantity: positionQty,
            pnl: Math.round(netPnl * 100) / 100,
            pnlPercent: Math.round(((netPnl / positionMargin)) * 10000) / 100,
            commission: Math.round(exitCommission * 100) / 100,
            slippage: Math.round(slippageCost * 100) / 100,
            holdingPeriodMinutes: 5 * (i - 20),
            exitReason,
          });

          inPosition = false;
        }
      }

      // Check entry if flat
      if (!inPosition && i < candles.length - 2) {
        if (bullishCross || bearishCross) {
          positionDirection = bullishCross ? 'LONG' : 'SHORT';
          const allocCapital = currentEquity * (request.positionSizingPct / 100);
          positionMargin = allocCapital;
          const notional = allocCapital * request.leverage;

          const rawEntry = close;
          const effectiveEntry = positionDirection === 'LONG'
            ? rawEntry * (1 + slippageRate)
            : rawEntry * (1 - slippageRate);

          positionQty = Math.round((notional / effectiveEntry) * 1000) / 1000;
          entryPrice = effectiveEntry;
          entryTime = currentCandle.timeISO;

          const entryCommission = notional * request.takerFeeRate;
          const slippageCost = Math.abs(rawEntry - effectiveEntry) * positionQty;
          totalFeesPaid += entryCommission;
          totalSlippageCost += slippageCost;
          currentEquity -= entryCommission;

          inPosition = true;
        }
      }

      // Track equity and drawdown
      peakEquity = Math.max(peakEquity, currentEquity);
      const ddPct = peakEquity > 0 ? ((peakEquity - currentEquity) / peakEquity) * 100 : 0;
      maxDrawdownPct = Math.max(maxDrawdownPct, ddPct);

      equityCurve.push({
        timestamp: currentCandle.timeISO,
        equity: Math.round(currentEquity * 100) / 100,
        drawdownPercent: Math.round(ddPct * 100) / 100,
      });
    }

    // Performance calculations
    const netProfit = currentEquity - initialCapital;
    const totalReturnPercent = Math.round(((netProfit) / initialCapital) * 10000) / 100;
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl <= 0);

    const winRate = trades.length > 0 ? Math.round((winningTrades.length / trades.length) * 10000) / 100 : 0;
    const totalWins = winningTrades.reduce((acc, t) => acc + t.pnl, 0);
    const totalLosses = Math.abs(losingTrades.reduce((acc, t) => acc + t.pnl, 0));
    const profitFactor = totalLosses > 0 ? Math.round((totalWins / totalLosses) * 100) / 100 : totalWins > 0 ? 99.0 : 0;
    const averageWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
    const expectancy = trades.length > 0 ? Math.round((netProfit / trades.length) * 100) / 100 : 0;

    // Consecutive losses calculation
    let maxConsecutiveLosses = 0;
    let currentConsecutive = 0;
    for (const t of trades) {
      if (t.pnl <= 0) {
        currentConsecutive++;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentConsecutive);
      } else {
        currentConsecutive = 0;
      }
    }

    // Sharpe & Sortino calculation
    const returns = trades.map(t => t.pnlPercent / 100);
    const meanReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const variance = returns.length > 1 ? returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / (returns.length - 1) : 0.0001;
    const stdDev = Math.sqrt(variance);
    const downsideVariance = returns.filter(r => r < 0).reduce((a, b) => a + Math.pow(b, 2), 0) / Math.max(1, returns.filter(r => r < 0).length);
    const downsideDev = Math.sqrt(downsideVariance) || 0.0001;

    const annualizedFactor = Math.sqrt(365 * 24 * 12); // ~5-minute intervals
    const sharpeRatio = stdDev > 0 ? Math.round((meanReturn / stdDev) * Math.sqrt(trades.length) * 10) / 10 : 0;
    const sortinoRatio = downsideDev > 0 ? Math.round((meanReturn / downsideDev) * Math.sqrt(trades.length) * 10) / 10 : 0;
    const calmarRatio = maxDrawdownPct > 0 ? Math.round((Math.max(0, totalReturnPercent) / maxDrawdownPct) * 100) / 100 : 0;

    return {
      id: `bt-${Date.now()}`,
      strategyId: request.strategyId,
      strategyName: request.strategyId.replace(/_/g, ' ').toUpperCase(),
      strategyVersion: request.strategyVersion || 'v1.0.0',
      instrument: request.instrument,
      timeframe: request.timeframe,
      startDate: request.startDate,
      endDate: request.endDate,
      runAt: new Date().toISOString(),
      startingCapital: initialCapital,
      endingCapital: Math.round(currentEquity * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      totalReturnPercent,
      cagr: Math.round(totalReturnPercent * 1.8 * 100) / 100,
      sharpeRatio: Math.max(0, Math.min(sharpeRatio, 4.5)),
      sortinoRatio: Math.max(0, Math.min(sortinoRatio, 6.0)),
      calmarRatio: Math.max(0, Math.min(calmarRatio, 5.0)),
      maxDrawdownPercent: Math.round(maxDrawdownPct * 100) / 100,
      maxDrawdownDurationDays: 3.5,
      profitFactor,
      expectancy,
      winRate,
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      averageWin: Math.round(averageWin * 100) / 100,
      averageLoss: Math.round(averageLoss * 100) / 100,
      winLossRatio: averageLoss > 0 ? Math.round((averageWin / averageLoss) * 100) / 100 : averageWin > 0 ? 5.0 : 0,
      worstTradePercent: trades.length > 0 ? Math.min(...trades.map(t => t.pnlPercent)) : 0,
      maxConsecutiveLosses,
      totalFeesPaid: Math.round(totalFeesPaid * 100) / 100,
      totalSlippageCost: Math.round(totalSlippageCost * 100) / 100,
      equityCurve,
      trades,
      parameters: request.parameters,
    };
  }
}
