import { Position, OrderResult, OrderIntent, WalletBalance } from '../types/quant.ts';

export interface PaperAccountLedger {
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

export class PaperTradingService {
  private initialCapital: number = 10000.0;
  private cashBalance: number = 10000.0;
  private realizedPnL: number = 0.0;
  private peakEquityToday: number = 10000.0;
  private positions: Map<string, Position> = new Map();
  private orders: OrderResult[] = [];
  private tradesToday: { pnl: number; timestamp: number }[] = [];

  constructor(initialCapital: number = 10000.0) {
    this.initialCapital = initialCapital;
    this.cashBalance = initialCapital;
    this.peakEquityToday = initialCapital;
  }

  /**
   * Updates mark price on open positions and recalculates unrealized PnL
   */
  public updateMarkPrice(symbol: string, currentPrice: number): void {
    const pos = this.positions.get(symbol);
    if (!pos) return;

    pos.markPrice = currentPrice;
    const priceDiff = pos.side === 'LONG' ? (currentPrice - pos.entryPrice) : (pos.entryPrice - currentPrice);
    pos.unrealizedPnL = Math.round((priceDiff * pos.size) * 100) / 100;
    pos.unrealizedPnLPercent = Math.round(((pos.unrealizedPnL / (pos.margin || 1)) * 100) * 100) / 100;
  }

  /**
   * Executes a paper order intent at the real current market price
   */
  public executePaperOrder(request: OrderIntent, currentMarketPrice: number): OrderResult {
    const fillPrice = request.orderType === 'MARKET' ? currentMarketPrice : (request.price || currentMarketPrice);
    const notional = request.quantity * fillPrice;
    const leverage = request.leverage || 5;
    const marginRequired = notional / leverage;
    const fee = Math.round((notional * 0.0005) * 100) / 100; // 0.05% taker fee

    const clientOrderId = request.clientOrderId || `paper-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Verify cash margin availability
    const availableMargin = this.getAvailableMargin();
    if (availableMargin < marginRequired + fee) {
      throw new Error(`INSUFFICIENT_MARGIN: Required ${marginRequired.toFixed(2)} USDT, available ${availableMargin.toFixed(2)} USDT.`);
    }

    // Deduct transaction fee
    this.cashBalance -= fee;

    // Handle existing position update or new position creation
    const targetSide: 'LONG' | 'SHORT' = request.side === 'BUY' ? 'LONG' : 'SHORT';
    const existing = this.positions.get(request.instrument);
    if (existing) {
      if (existing.side === targetSide) {
        // Adding to existing position
        const totalSize = existing.size + request.quantity;
        const weightedEntry = ((existing.entryPrice * existing.size) + (fillPrice * request.quantity)) / totalSize;
        existing.size = totalSize;
        existing.entryPrice = Math.round(weightedEntry * 100) / 100;
        existing.margin += marginRequired;
        existing.notional = totalSize * fillPrice;
      } else {
        // Closing or reducing position
        const closingSize = Math.min(existing.size, request.quantity);
        const pnl = existing.side === 'LONG'
          ? (fillPrice - existing.entryPrice) * closingSize
          : (existing.entryPrice - fillPrice) * closingSize;

        this.realizedPnL += pnl;
        this.cashBalance += pnl;
        this.tradesToday.push({ pnl, timestamp: Date.now() });

        if (request.quantity >= existing.size) {
          // Fully closed
          this.positions.delete(request.instrument);
          // If excess quantity, open reverse position
          const excess = request.quantity - existing.size;
          if (excess > 0) {
            this.createNewPosition(request.instrument, targetSide, excess, fillPrice, leverage);
          }
        } else {
          // Partially closed
          existing.size -= closingSize;
          existing.margin = (existing.size * existing.entryPrice) / leverage;
          existing.notional = existing.size * fillPrice;
        }
      }
    } else {
      this.createNewPosition(request.instrument, targetSide, request.quantity, fillPrice, leverage);
    }

    const orderRecord: OrderResult = {
      id: clientOrderId,
      clientOrderId,
      exchangeOrderId: `SIM-${clientOrderId}`,
      instrument: request.instrument,
      side: request.side,
      quantity: request.quantity,
      executedQuantity: request.quantity,
      price: fillPrice,
      avgFillPrice: fillPrice,
      status: 'FILLED',
      fee,
      feeCurrency: 'USDT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isSimulated: true,
    };

    this.orders.unshift(orderRecord);
    this.updateEquityPeak();

    return orderRecord;
  }

  private createNewPosition(
    instrument: string,
    side: 'LONG' | 'SHORT',
    size: number,
    entryPrice: number,
    leverage: number
  ): void {
    const notional = size * entryPrice;
    const margin = notional / leverage;
    const liquidationBuffer = (entryPrice * 0.9) / leverage;
    const liquidationPrice = side === 'LONG'
      ? Math.max(0, entryPrice - liquidationBuffer)
      : entryPrice + liquidationBuffer;

    const newPos: Position = {
      id: `pos-${instrument}-${Date.now()}`,
      instrument,
      side,
      size,
      quantity: size,
      entryPrice,
      markPrice: entryPrice,
      liquidationPrice: Math.round(liquidationPrice * 100) / 100,
      leverage,
      margin: Math.round(margin * 100) / 100,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      realizedPnL: 0,
      notional: Math.round(notional * 100) / 100,
      updatedAt: new Date().toISOString(),
      provenance: 'PAPER',
    };

    this.positions.set(instrument, newPos);
  }

  public getAvailableMargin(): number {
    let usedMargin = 0;
    for (const pos of this.positions.values()) {
      usedMargin += pos.margin;
    }
    return Math.max(0, this.cashBalance - usedMargin);
  }

  public getTotalUnrealizedPnL(): number {
    let sum = 0;
    for (const pos of this.positions.values()) {
      sum += pos.unrealizedPnL;
    }
    return Math.round(sum * 100) / 100;
  }

  public getEquity(): number {
    return Math.round((this.cashBalance + this.getTotalUnrealizedPnL()) * 100) / 100;
  }

  private updateEquityPeak(): void {
    const currentEquity = this.getEquity();
    if (currentEquity > this.peakEquityToday) {
      this.peakEquityToday = currentEquity;
    }
  }

  public getTodayDrawdown(): number {
    this.updateEquityPeak();
    const currentEquity = this.getEquity();
    if (this.peakEquityToday <= 0) return 0;
    const dd = ((this.peakEquityToday - currentEquity) / this.peakEquityToday) * 100;
    return Math.max(0, Math.round(dd * 100) / 100);
  }

  public getTodayRealizedPnL(): number {
    const startOfDay = new Date().setHours(0, 0, 0, 0);
    return this.tradesToday
      .filter((t) => t.timestamp >= startOfDay)
      .reduce((acc, t) => acc + t.pnl, 0);
  }

  public getAccountLedger(): PaperAccountLedger {
    this.updateEquityPeak();
    const unrealized = this.getTotalUnrealizedPnL();
    const equity = this.getEquity();
    let marginUsed = 0;
    for (const p of this.positions.values()) {
      marginUsed += p.margin;
    }

    return {
      initialCapital: this.initialCapital,
      cashBalance: Math.round(this.cashBalance * 100) / 100,
      unrealizedPnL: unrealized,
      realizedPnL: Math.round(this.realizedPnL * 100) / 100,
      equity,
      availableMargin: Math.round(this.getAvailableMargin() * 100) / 100,
      marginUsed: Math.round(marginUsed * 100) / 100,
      todayRealizedPnL: Math.round(this.getTodayRealizedPnL() * 100) / 100,
      todayDrawdownPercent: this.getTodayDrawdown(),
      peakEquityToday: Math.round(this.peakEquityToday * 100) / 100,
      positions: Array.from(this.positions.values()),
      orders: [...this.orders],
      lastUpdated: new Date().toISOString(),
    };
  }

  public markToMarket(symbol: string, currentPrice: number): void {
    this.updateMarkPrice(symbol, currentPrice);
  }

  public getSummary() {
    const ledger = this.getAccountLedger();
    return {
      equity: ledger.equity,
      totalEquity: ledger.equity,
      availableMargin: ledger.availableMargin,
      unrealizedPnL: ledger.unrealizedPnL,
      realizedPnL: ledger.realizedPnL,
      todayRealizedPnL: ledger.todayRealizedPnL,
      todayDrawdownPercent: ledger.todayDrawdownPercent,
      positions: ledger.positions,
      positionsCount: ledger.positions.length,
      provenance: 'PAPER' as const,
    };
  }

  public getPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  public getOrders(): OrderResult[] {
    return [...this.orders];
  }

  public createOrder(request: OrderIntent, currentMarketPrice: number = 0): OrderResult {
    return this.executePaperOrder(request, currentMarketPrice);
  }

  public cancelOrder(orderId: string): boolean {
    const order = this.orders.find(o => o.id === orderId || o.clientOrderId === orderId);
    if (order && order.status !== 'FILLED' && order.status !== 'CANCELLED') {
      order.status = 'CANCELLED';
      order.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  public exitPosition(instrument: string, currentMarketPrice: number = 0): {
    symbol: string;
    status: 'EXITED' | 'FAILED';
    executedPrice: number;
    pnlRealized: number;
  } {
    const pos = this.positions.get(instrument);
    if (!pos) {
      return {
        symbol: instrument,
        status: 'FAILED',
        executedPrice: 0,
        pnlRealized: 0,
      };
    }
    
    const closingSide: 'BUY' | 'SELL' = pos.side === 'LONG' ? 'SELL' : 'BUY';
    const fillPrice = currentMarketPrice || pos.markPrice;
    const initialRealized = this.realizedPnL;
    const clientOrderId = `exit-${Date.now()}`;
    const qty = pos.size ?? pos.quantity ?? 0;

    this.executePaperOrder({
      id: clientOrderId,
      clientOrderId,
      strategyId: 'manual-exit',
      strategyVersion: 'v1',
      signalId: 'exit',
      instrument,
      side: closingSide,
      quantity: qty,
      orderType: 'MARKET',
      leverage: pos.leverage || 1,
      marginType: 'ISOLATED',
      reduceOnly: true,
      createdAt: new Date().toISOString(),
    }, fillPrice);

    const pnlDelta = Math.round((this.realizedPnL - initialRealized) * 100) / 100;

    return {
      symbol: instrument,
      status: 'EXITED',
      executedPrice: fillPrice,
      pnlRealized: pnlDelta,
    };
  }

  public reset(capital: number = 10000.0): void {
    this.initialCapital = capital;
    this.cashBalance = capital;
    this.realizedPnL = 0;
    this.peakEquityToday = capital;
    this.positions.clear();
    this.orders = [];
    this.tradesToday = [];
  }
}

export const paperTradingService = new PaperTradingService(10000.0);
