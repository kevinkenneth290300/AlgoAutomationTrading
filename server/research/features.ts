import { Candle } from '../types/quant.ts';

export interface FeatureDefinition {
  name: string;
  version: string;
  inputs: string[];
  lookback?: number;
  compute(candles: Candle[], index?: number): number | string | Record<string, number>;
  missingDataPolicy: 'ZERO' | 'FORWARD_FILL' | 'SKIP' | 'FAIL';
}

/**
 * Calculates Simple Moving Average (SMA)
 */
export function calculateSMA(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1] || 0;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

/**
 * Calculates Exponential Moving Average (EMA)
 */
export function calculateEMA(values: number[], period: number): number {
  if (values.length === 0) return 0;
  const k = 2 / (period + 1);
  let ema = values[0];
  for (let i = 1; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
  }
  return Math.round(ema * 100) / 100;
}

/**
 * Calculates Relative Strength Index (RSI)
 */
export function calculateRSI(closes: number[], period: number = 14): number {
  if (closes.length <= period) return 50;
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? Math.abs(diff) : 0)) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round((100 - (100 / (1 + rs))) * 100) / 100;
}

/**
 * Calculates Average True Range (ATR)
 */
export function calculateATR(candles: Candle[], period: number = 14): number {
  if (candles.length < 2) return 0;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const prevC = candles[i - 1].close;
    const tr = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
    trs.push(tr);
  }
  return calculateSMA(trs, Math.min(period, trs.length));
}

/**
 * Calculates Volume Weighted Average Price (VWAP)
 */
export function calculateVWAP(candles: Candle[]): number {
  let cumVol = 0;
  let cumTypicalVol = 0;
  for (const c of candles) {
    const typical = (c.high + c.low + c.close) / 3;
    cumVol += c.volume;
    cumTypicalVol += typical * c.volume;
  }
  return cumVol > 0 ? Math.round((cumTypicalVol / cumVol) * 100) / 100 : candles[candles.length - 1]?.close || 0;
}

/**
 * Detects Market Structure: Higher Highs, Higher Lows, Lower Highs, Lower Lows, Break of Structure (BOS)
 */
export function detectMarketStructure(candles: Candle[]): {
  structure: 'HIGHER_HIGH' | 'LOWER_LOW' | 'HIGHER_LOW' | 'LOWER_HIGH' | 'BOS_BULLISH' | 'BOS_BEARISH' | 'RANGING';
  swingHigh: number;
  swingLow: number;
} {
  if (candles.length < 10) {
    return { structure: 'RANGING', swingHigh: 0, swingLow: 0 };
  }

  const lookback = Math.min(candles.length, 30);
  const subset = candles.slice(-lookback);
  const highest = Math.max(...subset.map(c => c.high));
  const lowest = Math.min(...subset.map(c => c.low));
  const latestClose = subset[subset.length - 1].close;
  const prevClose = subset[subset.length - 2].close;

  if (latestClose > highest * 0.998 && prevClose <= highest * 0.998) {
    return { structure: 'BOS_BULLISH', swingHigh: highest, swingLow: lowest };
  }
  if (latestClose < lowest * 1.002 && prevClose >= lowest * 1.002) {
    return { structure: 'BOS_BEARISH', swingHigh: highest, swingLow: lowest };
  }

  const firstHalf = subset.slice(0, Math.floor(subset.length / 2));
  const secondHalf = subset.slice(Math.floor(subset.length / 2));
  const high1 = Math.max(...firstHalf.map(c => c.high));
  const high2 = Math.max(...secondHalf.map(c => c.high));
  const low1 = Math.min(...firstHalf.map(c => c.low));
  const low2 = Math.min(...secondHalf.map(c => c.low));

  if (high2 > high1 && low2 > low1) return { structure: 'HIGHER_HIGH', swingHigh: high2, swingLow: low2 };
  if (high2 < high1 && low2 < low1) return { structure: 'LOWER_LOW', swingHigh: high2, swingLow: low2 };
  if (high2 < high1 && low2 > low1) return { structure: 'LOWER_HIGH', swingHigh: high2, swingLow: low2 };
  if (high2 > high1 && low2 < low1) return { structure: 'HIGHER_LOW', swingHigh: high2, swingLow: low2 };

  return { structure: 'RANGING', swingHigh: highest, swingLow: lowest };
}

/**
 * Versioned Feature Definitions Registry
 */
export const FEATURE_REGISTRY: Record<string, FeatureDefinition> = {
  returns: {
    name: 'returns',
    version: '1.0.0',
    inputs: ['close'],
    lookback: 1,
    compute: (candles) => {
      if (candles.length < 2) return 0;
      const c1 = candles[candles.length - 1].close;
      const c0 = candles[candles.length - 2].close;
      return Math.round(((c1 - c0) / c0) * 10000) / 100; // in %
    },
    missingDataPolicy: 'ZERO',
  },
  rsi_14: {
    name: 'rsi_14',
    version: '1.0.0',
    inputs: ['close'],
    lookback: 14,
    compute: (candles) => calculateRSI(candles.map(c => c.close), 14),
    missingDataPolicy: 'FORWARD_FILL',
  },
  ema_20: {
    name: 'ema_20',
    version: '1.0.0',
    inputs: ['close'],
    lookback: 20,
    compute: (candles) => calculateEMA(candles.map(c => c.close), 20),
    missingDataPolicy: 'FORWARD_FILL',
  },
  ema_50: {
    name: 'ema_50',
    version: '1.0.0',
    inputs: ['close'],
    lookback: 50,
    compute: (candles) => calculateEMA(candles.map(c => c.close), 50),
    missingDataPolicy: 'FORWARD_FILL',
  },
  vwap: {
    name: 'vwap',
    version: '1.0.0',
    inputs: ['high', 'low', 'close', 'volume'],
    lookback: 50,
    compute: (candles) => calculateVWAP(candles),
    missingDataPolicy: 'FORWARD_FILL',
  },
  distance_from_vwap: {
    name: 'distance_from_vwap',
    version: '1.0.0',
    inputs: ['close', 'vwap'],
    lookback: 50,
    compute: (candles) => {
      if (candles.length === 0) return 0;
      const close = candles[candles.length - 1].close;
      const vwap = calculateVWAP(candles);
      return Math.round(((close - vwap) / vwap) * 10000) / 100; // in %
    },
    missingDataPolicy: 'ZERO',
  },
  atr_14: {
    name: 'atr_14',
    version: '1.0.0',
    inputs: ['high', 'low', 'close'],
    lookback: 14,
    compute: (candles) => Math.round(calculateATR(candles, 14) * 100) / 100,
    missingDataPolicy: 'FORWARD_FILL',
  },
  relative_volume: {
    name: 'relative_volume',
    version: '1.0.0',
    inputs: ['volume'],
    lookback: 20,
    compute: (candles) => {
      if (candles.length < 5) return 1.0;
      const currentVol = candles[candles.length - 1].volume;
      const avgVol = calculateSMA(candles.map(c => c.volume), 20);
      return avgVol > 0 ? Math.round((currentVol / avgVol) * 100) / 100 : 1.0;
    },
    missingDataPolicy: 'FORWARD_FILL',
  },
  market_structure: {
    name: 'market_structure',
    version: '1.1.0',
    inputs: ['high', 'low', 'close'],
    lookback: 30,
    compute: (candles) => detectMarketStructure(candles).structure,
    missingDataPolicy: 'SKIP',
  },
};

/**
 * Computes snapshot of all required features for a candle series
 */
export function computeFeatureSnapshot(candles: Candle[]): Record<string, number> {
  const snapshot: Record<string, number> = {};
  if (candles.length === 0) return snapshot;

  const closes = candles.map(c => c.close);
  const currentPrice = closes[closes.length - 1];

  snapshot.current_price = currentPrice;
  snapshot.return_1 = candles.length > 1 ? ((currentPrice - closes[closes.length - 2]) / closes[closes.length - 2]) * 100 : 0;
  snapshot.rsi_14 = calculateRSI(closes, 14);
  snapshot.ema_20 = calculateEMA(closes, 20);
  snapshot.ema_50 = calculateEMA(closes, 50);
  snapshot.vwap = calculateVWAP(candles);
  snapshot.distance_from_vwap_pct = snapshot.vwap > 0 ? ((currentPrice - snapshot.vwap) / snapshot.vwap) * 100 : 0;
  snapshot.atr_14 = calculateATR(candles, 14);
  snapshot.relative_volume = FEATURE_REGISTRY.relative_volume.compute(candles) as number;

  const struct = detectMarketStructure(candles);
  snapshot.structure_code = struct.structure === 'HIGHER_HIGH' || struct.structure === 'BOS_BULLISH' ? 1 : struct.structure === 'LOWER_LOW' || struct.structure === 'BOS_BEARISH' ? -1 : 0;

  return snapshot;
}
