/**
 * Quantitative Technical Indicators Engine
 * Deterministic mathematical implementations without synthetic proxies or lookahead bias.
 */

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorSnapshot {
  ema20: number | null;
  ema50: number | null;
  sma20: number | null;
  vwap: number | null;
  rsi14: number | null;
  atr14: number | null;
}

/**
 * Calculates Simple Moving Average (SMA)
 */
export function calculateSMA(prices: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(prices.length).fill(null);
  if (prices.length < period) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  result[period - 1] = Math.round((sum / period) * 100) / 100;

  for (let i = period; i < prices.length; i++) {
    sum += prices[i] - prices[i - period];
    result[i] = Math.round((sum / period) * 100) / 100;
  }

  return result;
}

/**
 * Calculates Exponential Moving Average (EMA)
 */
export function calculateEMA(prices: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(prices.length).fill(null);
  if (prices.length < period) return result;

  // Initialize with SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  let prevEMA = sum / period;
  result[period - 1] = Math.round(prevEMA * 100) / 100;

  const multiplier = 2 / (period + 1);

  for (let i = period; i < prices.length; i++) {
    const currentPrice = prices[i];
    const currentEMA = (currentPrice - prevEMA) * multiplier + prevEMA;
    result[i] = Math.round(currentEMA * 100) / 100;
    prevEMA = currentEMA;
  }

  return result;
}

/**
 * Calculates Volume Weighted Average Price (VWAP)
 * Resets per session or cumulative across current window
 */
export function calculateVWAP(candles: CandleData[]): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length === 0) return result;

  let cumulativeTypicalVol = 0;
  let cumulativeVol = 0;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const typicalPrice = (c.high + c.low + c.close) / 3;
    cumulativeTypicalVol += typicalPrice * c.volume;
    cumulativeVol += c.volume;

    if (cumulativeVol > 0) {
      result[i] = Math.round((cumulativeTypicalVol / cumulativeVol) * 100) / 100;
    } else {
      result[i] = c.close;
    }
  }

  return result;
}

/**
 * Calculates Wilder's Relative Strength Index (RSI)
 */
export function calculateRSI(prices: number[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = new Array(prices.length).fill(null);
  if (prices.length <= period) return result;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  if (avgLoss === 0) {
    result[period] = 100;
  } else {
    const rs = avgGain / avgLoss;
    result[period] = Math.round((100 - (100 / (1 + rs))) * 100) / 100;
  }

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      result[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      result[i] = Math.round((100 - (100 / (1 + rs))) * 100) / 100;
    }
  }

  return result;
}

/**
 * Calculates Average True Range (ATR)
 */
export function calculateATR(candles: CandleData[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length <= period) return result;

  const trueRanges: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    const current = candles[i];
    if (i === 0) {
      trueRanges.push(current.high - current.low);
    } else {
      const prev = candles[i - 1];
      const tr = Math.max(
        current.high - current.low,
        Math.abs(current.high - prev.close),
        Math.abs(current.low - prev.close)
      );
      trueRanges.push(tr);
    }
  }

  // Initial ATR is simple average of first `period` true ranges
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += trueRanges[i];
  }
  let prevATR = sum / period;
  result[period - 1] = Math.round(prevATR * 100) / 100;

  // Wilder's smoothing
  for (let i = period; i < candles.length; i++) {
    const currentATR = (prevATR * (period - 1) + trueRanges[i]) / period;
    result[i] = Math.round(currentATR * 100) / 100;
    prevATR = currentATR;
  }

  return result;
}

/**
 * Computes complete indicator snapshot for the latest candle
 */
export function computeLatestIndicators(candles: CandleData[]): IndicatorSnapshot {
  if (candles.length === 0) {
    return {
      ema20: null,
      ema50: null,
      sma20: null,
      vwap: null,
      rsi14: null,
      atr14: null,
    };
  }

  const closes = candles.map((c) => c.close);
  const ema20Arr = calculateEMA(closes, 20);
  const ema50Arr = calculateEMA(closes, 50);
  const sma20Arr = calculateSMA(closes, 20);
  const vwapArr = calculateVWAP(candles);
  const rsi14Arr = calculateRSI(closes, 14);
  const atr14Arr = calculateATR(candles, 14);

  const lastIdx = candles.length - 1;

  return {
    ema20: ema20Arr[lastIdx],
    ema50: ema50Arr[lastIdx],
    sma20: sma20Arr[lastIdx],
    vwap: vwapArr[lastIdx],
    rsi14: rsi14Arr[lastIdx],
    atr14: atr14Arr[lastIdx],
  };
}
