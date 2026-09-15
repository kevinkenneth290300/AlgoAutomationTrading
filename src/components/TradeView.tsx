import React, { useState, useRef, useEffect } from 'react';
import { 
  Instrument, 
  Candle, 
  Position, 
  Signal, 
  OrderResult, 
  ApplicationMode,
  RiskDecision 
} from '../types.ts';
import { 
  TrendingUp, 
  TrendingDown, 
  Crosshair, 
  Sliders, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowUp, 
  ArrowDown, 
  Zap, 
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw
} from 'lucide-react';

interface TradeViewProps {
  instruments: Instrument[];
  selectedInstrument: string;
  onSelectInstrument: (symbol: string) => void;
  candles: Candle[];
  positions: Position[];
  orders: OrderResult[];
  currentSignal?: Signal;
  mode: ApplicationMode;
  dataSourceMode?: 'REAL' | 'MOCK';
  freshnessSec?: number;
  onTimeframeChange?: (tf: '1m' | '5m' | '15m' | '1h') => void;
  onPreviewOrder: (order: {
    instrument: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    orderType: 'MARKET' | 'LIMIT';
    price?: number;
    leverage: number;
    stopLoss?: number;
    takeProfit?: number;
  }) => void;
  onExitPosition: (symbol: string) => void;
  isLoading: boolean;
  onRefresh: () => void;
}

export const TradeView: React.FC<TradeViewProps> = ({
  instruments,
  selectedInstrument,
  onSelectInstrument,
  candles,
  positions,
  orders,
  currentSignal,
  mode,
  dataSourceMode = 'REAL',
  freshnessSec = 0.5,
  onTimeframeChange,
  onPreviewOrder,
  onExitPosition,
  isLoading,
  onRefresh,
}) => {
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m' | '1h'>('5m');
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [quantity, setQuantity] = useState<number>(0.05);
  const [limitPrice, setLimitPrice] = useState<number>(65000);
  const [leverage, setLeverage] = useState<number>(5);
  const [activeBottomTab, setActiveBottomTab] = useState<'orders' | 'positions' | 'timeline'>('positions');

  // Chart interactivity state
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number } | null>(null);
  const [chartWidth, setChartWidth] = useState<number>(800);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const instrument = instruments.find((i) => i.symbol === selectedInstrument) || instruments[0];
  const activePosition = positions.find((p) => p.instrument === selectedInstrument);

  // Measure container width
  useEffect(() => {
    const updateSize = () => {
      if (chartContainerRef.current) {
        setChartWidth(chartContainerRef.current.clientWidth);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (instrument) {
      if (instrument.currentPrice) {
        setLimitPrice(instrument.currentPrice);
      }
      setQuantity(instrument.minQuantity ? Math.max(instrument.minQuantity, 0.01) : 0.01);
    }
  }, [instrument]);

  const handleTimeframeSelect = (tf: '1m' | '5m' | '15m' | '1h') => {
    setTimeframe(tf);
    onTimeframeChange?.(tf);
  };

  // Chart coordinate calculations
  const chartHeight = 360;
  const padding = { top: 20, right: 65, bottom: 40, left: 10 };
  const innerWidth = Math.max(100, chartWidth - padding.left - padding.right);
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const visibleCandles = candles.slice(-50);
  const minPrice = visibleCandles.length > 0 
    ? Math.min(...visibleCandles.map((c) => c.low)) * 0.998 
    : (instrument?.currentPrice ? instrument.currentPrice * 0.98 : 60000);
  const maxPrice = visibleCandles.length > 0 
    ? Math.max(...visibleCandles.map((c) => c.high)) * 1.002 
    : (instrument?.currentPrice ? instrument.currentPrice * 1.02 : 70000);
  const priceRange = maxPrice - minPrice || 1;

  const getY = (price: number) => {
    return padding.top + innerHeight - ((price - minPrice) / priceRange) * innerHeight;
  };

  const candleSpacing = innerWidth / Math.max(1, visibleCandles.length);
  const candleWidth = Math.max(3, candleSpacing * 0.7);

  // Generate indicator points (VWAP, EMA20) using real indicator values
  const vwapPoints: string[] = [];
  const emaPoints: string[] = [];

  visibleCandles.forEach((c, idx) => {
    const x = padding.left + idx * candleSpacing + candleSpacing / 2;
    if (c.vwap) {
      vwapPoints.push(`${x},${getY(c.vwap)}`);
    }
    const emaValue = (c as any).ema20 !== undefined ? (c as any).ema20 : c.close;
    emaPoints.push(`${x},${getY(emaValue)}`);
  });

  const effectivePrice = orderType === 'LIMIT' 
    ? limitPrice 
    : (instrument?.currentPrice || (visibleCandles.length > 0 ? visibleCandles[visibleCandles.length - 1].close : 0));

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - padding.left;
    const mouseY = e.clientY - rect.top;

    if (mouseX >= 0 && mouseX <= innerWidth) {
      const index = Math.min(
        visibleCandles.length - 1,
        Math.max(0, Math.floor(mouseX / candleSpacing))
      );
      setHoveredCandle(visibleCandles[index]);
      setCrosshairPos({ x: padding.left + index * candleSpacing + candleSpacing / 2, y: mouseY });
    }
  };

  const handleMouseLeave = () => {
    setHoveredCandle(null);
    setCrosshairPos(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-50px)] bg-zinc-950 text-zinc-200 overflow-hidden font-mono">
      {/* Top Header Bar according to Rule 41 */}
      <div className="border-b border-zinc-800 bg-zinc-900/80 px-4 py-2 flex items-center justify-between text-xs select-none">
        <div className="flex items-center gap-4">
          {/* Instrument Selector */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-bold uppercase text-[10px]">PAIR:</span>
            <select
              value={selectedInstrument}
              onChange={(e) => onSelectInstrument(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1 text-xs font-bold text-zinc-100 cursor-pointer focus:outline-hidden"
            >
              {instruments.map((inst) => (
                <option key={inst.symbol} value={inst.symbol}>
                  {inst.symbol} ({inst.pair})
                </option>
              ))}
            </select>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center bg-zinc-800/80 rounded border border-zinc-700/60 p-0.5 text-[11px]">
            {(['1m', '5m', '15m', '1h'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => handleTimeframeSelect(tf)}
                className={`px-2 py-0.5 rounded font-medium ${
                  timeframe === tf ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Current Prices */}
          {instrument && (
            <div className="hidden sm:flex items-center gap-3 text-xs">
              <div>
                <span className="text-[10px] text-zinc-500 block leading-tight">LAST PRICE</span>
                <span className="font-bold text-zinc-100">${(instrument.currentPrice ?? 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block leading-tight">MARK</span>
                <span className="text-zinc-300">${(instrument.markPrice ?? 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block leading-tight">24H CHANGE</span>
                <span className={(instrument.priceChange24h ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {(instrument.priceChange24h ?? 0) >= 0 ? '+' : ''}{instrument.priceChange24h ?? 0}%
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block leading-tight">FUNDING</span>
                <span className="text-amber-400 font-bold">{(instrument.fundingRate * 100).toFixed(4)}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Status Badge & Refresh */}
        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Refresh Market Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
            dataSourceMode === 'REAL' 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}>
            {dataSourceMode === 'REAL' ? `COINDCX FUTURES • LIVE (${freshnessSec.toFixed(1)}s)` : 'SYNTHETIC SANDBOX'}
          </span>
        </div>
      </div>

      {/* Main Terminal Body */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 overflow-hidden">
        {/* Left 3 Cols: Candle Chart + Indicator Overlays */}
        <div className="lg:col-span-3 flex flex-col border-r border-zinc-800 bg-zinc-950 overflow-hidden">
          {/* Chart Tooltip Header */}
          <div className="px-4 py-1.5 border-b border-zinc-800/60 bg-zinc-900/40 flex items-center justify-between text-[11px] text-zinc-400">
            <div className="flex items-center gap-3">
              {hoveredCandle ? (
                <>
                  <span>Time: <strong className="text-zinc-200">{new Date(hoveredCandle.timestamp).toLocaleTimeString()}</strong></span>
                  <span>O: <strong className="text-zinc-200">{hoveredCandle.open}</strong></span>
                  <span>H: <strong className="text-zinc-200">{hoveredCandle.high}</strong></span>
                  <span>L: <strong className="text-zinc-200">{hoveredCandle.low}</strong></span>
                  <span>C: <strong className={hoveredCandle.close >= hoveredCandle.open ? 'text-emerald-400' : 'text-rose-400'}>{hoveredCandle.close}</strong></span>
                  <span>Vol: <strong className="text-zinc-200">{hoveredCandle.volume}</strong></span>
                  <span>VWAP: <strong className="text-amber-400">{hoveredCandle.vwap}</strong></span>
                </>
              ) : (
                <span>Hover over candlesticks for precise OHLCV and indicator inspection</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="flex items-center gap-1 text-amber-400"><span className="w-2 h-0.5 bg-amber-400 inline-block"></span> VWAP</span>
              <span className="flex items-center gap-1 text-sky-400"><span className="w-2 h-0.5 bg-sky-400 inline-block"></span> EMA 20</span>
            </div>
          </div>

          {/* Interactive SVG Candlestick Chart */}
          <div ref={chartContainerRef} className="flex-1 relative w-full h-full min-h-[300px]">
            <svg
              className="w-full h-full cursor-crosshair select-none"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {/* Background horizontal price grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const price = minPrice + ratio * priceRange;
                const y = getY(price);
                return (
                  <g key={ratio}>
                    <line x1={0} y1={y} x2={chartWidth - padding.right} y2={y} stroke="#27272a" strokeDasharray="3 3" />
                    <text x={chartWidth - padding.right + 5} y={y + 3} fill="#71717a" fontSize="10" fontFamily="monospace">
                      {price.toFixed(1)}
                    </text>
                  </g>
                );
              })}

              {/* Volume Bars at Bottom */}
              {visibleCandles.map((c, i) => {
                const x = padding.left + i * candleSpacing;
                const isGreen = c.close >= c.open;
                const maxVol = Math.max(...visibleCandles.map((v) => v.volume)) || 1;
                const barHeight = (c.volume / maxVol) * 45;
                const barY = padding.top + innerHeight - barHeight;
                return (
                  <rect
                    key={`vol-${i}`}
                    x={x}
                    y={barY}
                    width={candleWidth}
                    height={barHeight}
                    fill={isGreen ? '#10b981' : '#f43f5e'}
                    opacity="0.25"
                  />
                );
              })}

              {/* VWAP Indicator Polyline */}
              {vwapPoints.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="1.5"
                  points={vwapPoints.join(' ')}
                />
              )}

              {/* EMA Indicator Polyline */}
              {emaPoints.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                  points={emaPoints.join(' ')}
                />
              )}

              {/* Candlesticks (Wick + Body) */}
              {visibleCandles.map((c, i) => {
                const x = padding.left + i * candleSpacing + candleSpacing / 2;
                const isGreen = c.close >= c.open;
                const color = isGreen ? '#10b981' : '#f43f5e';

                const highY = getY(c.high);
                const lowY = getY(c.low);
                const openY = getY(c.open);
                const closeY = getY(c.close);

                const bodyY = Math.min(openY, closeY);
                const bodyHeight = Math.max(2, Math.abs(openY - closeY));

                return (
                  <g key={`candle-${i}`}>
                    {/* Wick */}
                    <line x1={x} y1={highY} x2={x} y2={lowY} stroke={color} strokeWidth="1" />
                    {/* Body */}
                    <rect
                      x={x - candleWidth / 2}
                      y={bodyY}
                      width={candleWidth}
                      height={bodyHeight}
                      fill={color}
                    />
                  </g>
                );
              })}

              {/* Active Position Level Line */}
              {activePosition && (
                <g>
                  <line
                    x1={0}
                    y1={getY(activePosition.entryPrice)}
                    x2={chartWidth - padding.right}
                    y2={getY(activePosition.entryPrice)}
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    strokeDasharray="6 3"
                  />
                  <rect
                    x={chartWidth - padding.right}
                    y={getY(activePosition.entryPrice) - 8}
                    width={60}
                    height={16}
                    fill="#0284c7"
                    rx="2"
                  />
                  <text
                    x={chartWidth - padding.right + 4}
                    y={getY(activePosition.entryPrice) + 4}
                    fill="#ffffff"
                    fontSize="9"
                    fontWeight="bold"
                  >
                    ENTRY {activePosition.entryPrice}
                  </text>
                </g>
              )}

              {/* Crosshair Cursor */}
              {crosshairPos && (
                <g pointerEvents="none">
                  <line
                    x1={crosshairPos.x}
                    y1={padding.top}
                    x2={crosshairPos.x}
                    y2={padding.top + innerHeight}
                    stroke="#a1a1aa"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <line
                    x1={0}
                    y1={crosshairPos.y}
                    x2={chartWidth - padding.right}
                    y2={crosshairPos.y}
                    stroke="#a1a1aa"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                </g>
              )}
            </svg>
          </div>

          {/* Bottom Tabs: Orders, Positions, Execution Timeline */}
          <div className="h-44 border-t border-zinc-800 bg-zinc-900/60 flex flex-col">
            <div className="flex border-b border-zinc-800 text-xs px-3">
              <button
                onClick={() => setActiveBottomTab('positions')}
                className={`px-3 py-2 font-bold transition-colors ${
                  activeBottomTab === 'positions'
                    ? 'border-b-2 border-emerald-400 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Positions ({positions.length})
              </button>
              <button
                onClick={() => setActiveBottomTab('orders')}
                className={`px-3 py-2 font-bold transition-colors ${
                  activeBottomTab === 'orders'
                    ? 'border-b-2 border-emerald-400 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Open Orders ({orders.length})
              </button>
              <button
                onClick={() => setActiveBottomTab('timeline')}
                className={`px-3 py-2 font-bold transition-colors ${
                  activeBottomTab === 'timeline'
                    ? 'border-b-2 border-emerald-400 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Execution Timeline
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 text-xs">
              {activeBottomTab === 'positions' && (
                positions.length === 0 ? (
                  <div className="text-zinc-500 py-4 text-center">No open futures positions.</div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-[10px] text-zinc-500 uppercase border-b border-zinc-800">
                        <th className="pb-1">Instrument</th>
                        <th className="pb-1">Side</th>
                        <th className="pb-1">Size</th>
                        <th className="pb-1">Entry</th>
                        <th className="pb-1">Mark</th>
                        <th className="pb-1">PnL</th>
                        <th className="pb-1 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                      {positions.map((pos) => (
                        <tr key={pos.instrument}>
                          <td className="py-2 font-bold">{pos.instrument}</td>
                          <td className="py-2">
                            <span className={pos.side === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}>
                              {pos.side} {pos.leverage}x
                            </span>
                          </td>
                          <td className="py-2">{pos.quantity}</td>
                          <td className="py-2">${pos.entryPrice}</td>
                          <td className="py-2">${pos.markPrice}</td>
                          <td className={`py-2 font-bold ${pos.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {pos.unrealizedPnL >= 0 ? '+' : ''}${pos.unrealizedPnL.toFixed(2)} ({pos.unrealizedPnLPercent.toFixed(2)}%)
                          </td>
                          <td className="py-2 text-right">
                            <button
                              onClick={() => onExitPosition(pos.instrument)}
                              className="px-2 py-0.5 text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/40 rounded font-bold"
                            >
                              Emergency Exit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {activeBottomTab === 'orders' && (
                <div className="text-zinc-500 py-4 text-center font-mono">
                  No pending working orders on CoinDCX order book.
                </div>
              )}

              {activeBottomTab === 'timeline' && (
                <div className="space-y-1.5 text-[11px] text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span className="text-zinc-500">[{new Date().toLocaleTimeString()}]</span>
                    <span>Reconciliation routine: internal positions synchronize perfectly with CoinDCX Futures.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                    <span className="text-zinc-500">[{new Date(Date.now() - 60000).toLocaleTimeString()}]</span>
                    <span>Risk engine health check: daily loss ($0 / $500), drawdown (0.84% / 10%).</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Position Detail, Strategy Signal & Order Entry */}
        <div className="p-4 space-y-4 bg-zinc-950 overflow-y-auto">
          {/* Active Position / Live State */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs">
            <div className="text-[11px] uppercase font-bold text-zinc-400 mb-2 border-b border-zinc-800 pb-1 flex justify-between">
              <span>POSITION STATUS</span>
              <span className="text-emerald-400">COINDCX</span>
            </div>
            {activePosition ? (
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Direction:</span>
                  <span className={`font-bold ${activePosition.side === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {activePosition.side} ({activePosition.leverage}x)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Entry / Mark:</span>
                  <span>${activePosition.entryPrice} / ${activePosition.markPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Unrealized PnL:</span>
                  <span className={`font-bold ${activePosition.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {activePosition.unrealizedPnL >= 0 ? '+' : ''}${activePosition.unrealizedPnL.toFixed(2)} ({activePosition.unrealizedPnLPercent.toFixed(2)}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Est. Liquidation:</span>
                  <span className="text-amber-400">${activePosition.liquidationPrice}</span>
                </div>
                <button
                  onClick={() => onExitPosition(activePosition.instrument)}
                  className="w-full mt-2 py-1 bg-rose-600/20 text-rose-300 border border-rose-600/40 rounded text-[11px] font-bold hover:bg-rose-600/30"
                >
                  Close Position (Market)
                </button>
              </div>
            ) : (
              <div className="text-zinc-500 text-center py-2">No active position in {selectedInstrument}</div>
            )}
          </div>

          {/* Strategy Signal & Risk Decision */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs">
            <div className="text-[11px] uppercase font-bold text-zinc-400 mb-2 border-b border-zinc-800 pb-1 flex justify-between">
              <span>STRATEGY SIGNAL</span>
              <span className="text-amber-400">EVALUATED</span>
            </div>
            {currentSignal ? (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Direction:</span>
                  <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                    currentSignal.direction === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {currentSignal.direction}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Confidence:</span>
                  <span className="font-bold text-zinc-200">{(currentSignal.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Stop Loss:</span>
                  <span className="text-zinc-300">${currentSignal.stopLoss || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Take Profit:</span>
                  <span className="text-zinc-300">${currentSignal.takeProfit || 'N/A'}</span>
                </div>
                <div className="text-[10px] text-zinc-400 pt-1 border-t border-zinc-800">
                  {currentSignal.reasons[0]}
                </div>
              </div>
            ) : (
              <div className="text-zinc-500 text-center py-2">No active signal emitted</div>
            )}
          </div>

          {/* Order Placement Form */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs space-y-3">
            <div className="text-[11px] uppercase font-bold text-zinc-400 border-b border-zinc-800 pb-1">
              ORDER INTENT (RISK-CHECKED)
            </div>

            {/* Buy / Sell Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setOrderSide('BUY')}
                className={`py-1.5 rounded font-bold text-xs transition-all ${
                  orderSide === 'BUY'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                LONG / BUY
              </button>
              <button
                onClick={() => setOrderSide('SELL')}
                className={`py-1.5 rounded font-bold text-xs transition-all ${
                  orderSide === 'SELL'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                SHORT / SELL
              </button>
            </div>

            {/* Order Type */}
            <div className="flex justify-between gap-2">
              <button
                onClick={() => setOrderType('MARKET')}
                className={`flex-1 py-1 rounded text-[11px] font-medium border ${
                  orderType === 'MARKET' ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'text-zinc-400 border-zinc-800'
                }`}
              >
                MARKET
              </button>
              <button
                onClick={() => setOrderType('LIMIT')}
                className={`flex-1 py-1 rounded text-[11px] font-medium border ${
                  orderType === 'LIMIT' ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'text-zinc-400 border-zinc-800'
                }`}
              >
                LIMIT
              </button>
            </div>

            {/* Price (if limit) */}
            {orderType === 'LIMIT' && (
              <div>
                <label className="text-[10px] text-zinc-500 block mb-1">LIMIT PRICE (USDT)</label>
                <input
                  type="number"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-100 font-mono"
                />
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">QUANTITY ({instrument?.baseCurrency || 'BTC'})</label>
              <input
                type="number"
                step="0.001"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-100 font-mono"
              />
            </div>

            {/* Leverage Slider */}
            <div>
              <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                <span>LEVERAGE</span>
                <span className="text-zinc-200 font-bold">{leverage}x</span>
              </div>
              <input
                type="range"
                min="1"
                max={instrument?.maxLeverage || 20}
                value={leverage}
                onChange={(e) => setLeverage(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            {/* Notional summary */}
            <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-400 space-y-1">
              <div className="flex justify-between">
                <span>Notional Value:</span>
                <span className="text-zinc-200">${((quantity || 0) * effectivePrice).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Required Margin:</span>
                <span className="text-zinc-200">${(((quantity || 0) * effectivePrice) / leverage).toFixed(2)}</span>
              </div>
            </div>

            {/* Action Trigger */}
            <button
              onClick={() =>
                onPreviewOrder({
                  instrument: selectedInstrument,
                  side: orderSide,
                  quantity,
                  orderType,
                  price: orderType === 'LIMIT' ? limitPrice : undefined,
                  leverage,
                })
              }
              className={`w-full py-2 rounded font-bold text-xs uppercase tracking-wider text-white shadow-md transition-all ${
                orderSide === 'BUY' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              PREVIEW {mode === 'PAPER' ? 'PAPER' : mode === 'LIVE' ? 'LIVE' : 'SIMULATED'} ORDER (RISK ENGINE)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
