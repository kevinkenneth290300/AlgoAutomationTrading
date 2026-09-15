import React from 'react';
import { RiskDecision, ApplicationMode } from '../types.ts';
import { ShieldCheck, AlertTriangle, XCircle, CheckCircle, Lock } from 'lucide-react';

interface OrderPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  orderIntent: {
    instrument: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    orderType: 'MARKET' | 'LIMIT';
    price?: number;
    leverage: number;
    stopLoss?: number;
    takeProfit?: number;
    strategyId?: string;
    strategyVersion?: string;
  } | null;
  riskDecision: RiskDecision | null;
  mode: ApplicationMode;
  isSubmitting: boolean;
}

export const OrderPreviewModal: React.FC<OrderPreviewModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  orderIntent,
  riskDecision,
  mode,
  isSubmitting,
}) => {
  if (!isOpen || !orderIntent) return null;

  const notional = (orderIntent.quantity || 0) * (orderIntent.price || 65000);
  const estFees = notional * 0.0005; // 5 bps futures fee
  const isAllowed = riskDecision?.allowed ?? true;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-mono text-zinc-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-lg w-full p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-100">
              Pre-Execution Order & Risk Review (Rule 61)
            </h2>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
            MODE: {mode}
          </span>
        </div>

        {/* Risk Engine Decision Status */}
        {riskDecision && (
          <div className={`p-3 rounded border text-xs flex items-center gap-2.5 ${
            isAllowed
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            {isAllowed ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
            <div>
              <div className="font-bold uppercase tracking-wider">
                Risk Engine Verdict: {riskDecision.action}
              </div>
              <div className="text-[11px] opacity-90">{riskDecision.reason}</div>
            </div>
          </div>
        )}

        {/* Order Details Matrix */}
        <div className="bg-zinc-950 p-3.5 rounded border border-zinc-800 text-xs space-y-2">
          <div className="flex justify-between py-1 border-b border-zinc-900">
            <span className="text-zinc-500">Target Instrument:</span>
            <span className="font-bold text-zinc-100">{orderIntent.instrument} (CoinDCX Futures)</span>
          </div>
          <div className="flex justify-between py-1 border-b border-zinc-900">
            <span className="text-zinc-500">Order Side & Type:</span>
            <span className={`font-bold ${orderIntent.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
              {orderIntent.side} ({orderIntent.orderType})
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-zinc-900">
            <span className="text-zinc-500">Quantity:</span>
            <span className="text-zinc-200">{orderIntent.quantity} units</span>
          </div>
          <div className="flex justify-between py-1 border-b border-zinc-900">
            <span className="text-zinc-500">Execution / Limit Price:</span>
            <span className="text-zinc-200">{orderIntent.price != null ? `$${orderIntent.price.toLocaleString()}` : 'MARKET'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-zinc-900">
            <span className="text-zinc-500">Leverage:</span>
            <span className="text-zinc-200 font-bold">{orderIntent.leverage}x</span>
          </div>
          <div className="flex justify-between py-1 border-b border-zinc-900">
            <span className="text-zinc-500">Total Notional Value:</span>
            <span className="text-zinc-100 font-bold">${notional.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-zinc-900">
            <span className="text-zinc-500">Estimated Exchange Fee (0.05%):</span>
            <span className="text-zinc-300">${estFees.toFixed(3)}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-zinc-900">
            <span className="text-zinc-500">Origin Strategy:</span>
            <span className="text-zinc-400">
              {orderIntent.strategyId || 'Manual / Discretionary Intent'} ({orderIntent.strategyVersion || 'v1'})
            </span>
          </div>
        </div>

        {/* Execution Mode Warning */}
        <div className="text-[11px] text-zinc-400 leading-relaxed bg-zinc-900 p-2.5 rounded border border-zinc-800">
          {mode === 'RESEARCH' || mode === 'BACKTEST' ? (
            <span className="text-sky-400">
              ℹ This intent will be simulated in Research / Sandbox mode. No exchange orders will be submitted.
            </span>
          ) : mode === 'PAPER' ? (
            <span className="text-amber-400">
              ℹ Order will be processed by PaperExecutionAdapter with realistic market fills and slippage.
            </span>
          ) : (
            <span className="text-rose-400 font-bold">
              ⚠ WARNING: Live Armed mode. Live orders will be sent to CoinDCX Futures.
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs font-bold"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!isAllowed || isSubmitting}
            className={`px-5 py-2 rounded text-xs font-bold uppercase tracking-wider text-white ${
              !isAllowed
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {isSubmitting ? 'Processing Intent...' : 'Confirm & Execute Intent'}
          </button>
        </div>
      </div>
    </div>
  );
};
