import {
  ExchangeAdapter,
  ExchangeCapabilities,
  MarketDataSummary,
  CancelOrderRequest,
  CancelResult,
  EditOrderRequest,
  ExitPositionRequest,
  ExitResult,
  ReconciliationResult,
  generateSimulatedCandles
} from './adapter.ts';
import { Instrument, Position, OrderResult, OrderIntent, WalletBalance } from '../types/quant.ts';

export class MockCoinDCXAdapter implements ExchangeAdapter {
  private balance: number = 25000.0;
  private positions: Map<string, Position> = new Map();
  private orders: Map<string, OrderResult> = new Map();
  private latencyMs: number = 45;
  private lastExchangeEventAt: number = Date.now();

  public getLastExchangeEventAt(): number {
    return this.lastExchangeEventAt;
  }

  public isDataFresh(thresholdMs: number = 10000): boolean {
    return (Date.now() - this.lastExchangeEventAt) <= thresholdMs;
  }

  public async ping(): Promise<number> {
    await this.simulateLatency();
    this.lastExchangeEventAt = Date.now();
    return this.latencyMs;
  }

  constructor() {
    // Initialize standard mock positions for demonstration
    this.positions.set('B-BTC_USDT', {
      instrument: 'B-BTC_USDT',
      side: 'LONG',
      quantity: 0.15,
      entryPrice: 64800.0,
      markPrice: 65425.0,
      liquidationPrice: 58200.0,
      leverage: 5,
      margin: 1944.0,
      unrealizedPnL: 93.75,
      unrealizedPnLPercent: 4.82,
      realizedPnL: 15.2,
      stopLoss: 63500.0,
      takeProfit: 67500.0,
      updatedAt: new Date().toISOString(),
      isSimulated: true,
    });
  }

  async getCapabilities(): Promise<ExchangeCapabilities> {
    await this.simulateLatency();
    return {
      exchangeName: 'CoinDCX Futures (SIMULATED SANDBOX)',
      futuresSupported: true,
      leverageMax: 25,
      marketOrdersAllowed: true,
      limitOrdersAllowed: true,
      stopLossAllowed: true,
      takeProfitAllowed: true,
      trailingStopAllowed: true,
      hedgingAllowed: false,
      rateLimitPerMinute: 1200,
      environment: 'mock',
      serverTime: new Date().toISOString(),
    };
  }

  async getInstruments(): Promise<Instrument[]> {
    await this.simulateLatency();
    return [
      {
        symbol: 'B-BTC_USDT',
        pair: 'BTC/USDT',
        baseCurrency: 'BTC',
        quoteCurrency: 'USDT',
        settlementCurrency: 'USDT',
        contractType: 'PERPETUAL_FUTURES',
        status: 'ACTIVE',
        minQuantity: 0.001,
        maxQuantity: 50,
        stepSize: 0.001,
        tickSize: 0.1,
        minNotional: 5,
        maxLeverage: 25,
        supportedOrderTypes: ['MARKET', 'LIMIT', 'STOP_MARKET', 'TAKE_PROFIT_MARKET'],
        makerFeeRate: 0.0002,
        takerFeeRate: 0.0005,
        currentPrice: 65420.5,
        markPrice: 65425.0,
        indexPrice: 65418.2,
        fundingRate: 0.0001,
        nextFundingTime: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
        openInterest: 14500.2,
        volume24h: 420000000,
        priceChange24h: 2.15,
        high24h: 66150.0,
        low24h: 63800.0,
        lastUpdated: new Date().toISOString(),
      },
      {
        symbol: 'B-ETH_USDT',
        pair: 'ETH/USDT',
        baseCurrency: 'ETH',
        quoteCurrency: 'USDT',
        settlementCurrency: 'USDT',
        contractType: 'PERPETUAL_FUTURES',
        status: 'ACTIVE',
        minQuantity: 0.01,
        maxQuantity: 500,
        stepSize: 0.01,
        tickSize: 0.05,
        minNotional: 5,
        maxLeverage: 20,
        supportedOrderTypes: ['MARKET', 'LIMIT', 'STOP_MARKET'],
        makerFeeRate: 0.0002,
        takerFeeRate: 0.0005,
        currentPrice: 3482.1,
        markPrice: 3483.0,
        indexPrice: 3481.5,
        fundingRate: 0.00012,
        nextFundingTime: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
        openInterest: 94000.0,
        volume24h: 195000000,
        priceChange24h: -0.64,
        high24h: 3550.0,
        low24h: 3420.0,
        lastUpdated: new Date().toISOString(),
      },
      {
        symbol: 'B-SOL_USDT',
        pair: 'SOL/USDT',
        baseCurrency: 'SOL',
        quoteCurrency: 'USDT',
        settlementCurrency: 'USDT',
        contractType: 'PERPETUAL_FUTURES',
        status: 'ACTIVE',
        minQuantity: 0.1,
        maxQuantity: 2000,
        stepSize: 0.1,
        tickSize: 0.01,
        minNotional: 5,
        maxLeverage: 15,
        supportedOrderTypes: ['MARKET', 'LIMIT', 'STOP_MARKET'],
        makerFeeRate: 0.0002,
        takerFeeRate: 0.0005,
        currentPrice: 153.25,
        markPrice: 153.3,
        indexPrice: 153.2,
        fundingRate: 0.00008,
        nextFundingTime: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
        openInterest: 520000.0,
        volume24h: 110000000,
        priceChange24h: 4.95,
        high24h: 157.0,
        low24h: 145.2,
        lastUpdated: new Date().toISOString(),
      }
    ];
  }

  async getMarketData(symbol: string): Promise<MarketDataSummary> {
    await this.simulateLatency();
    const candles = generateSimulatedCandles(symbol, 80);
    const lastPrice = candles[candles.length - 1].close;

    return {
      symbol,
      lastPrice,
      markPrice: lastPrice + 1.5,
      indexPrice: lastPrice + 0.8,
      fundingRate: 0.0001,
      volume24h: 245000000,
      high24h: lastPrice * 1.025,
      low24h: lastPrice * 0.975,
      orderBook: {
        bids: [
          [lastPrice - 0.5, 1.45],
          [lastPrice - 1.5, 3.20],
          [lastPrice - 3.0, 6.80],
          [lastPrice - 5.0, 11.5],
        ],
        asks: [
          [lastPrice + 0.5, 1.10],
          [lastPrice + 1.5, 2.90],
          [lastPrice + 3.0, 5.40],
          [lastPrice + 5.0, 9.80],
        ],
      },
      recentTrades: [
        { id: `tr-${Date.now()}-1`, price: lastPrice, quantity: 0.25, side: 'BUY', timestamp: Date.now() - 1200 },
        { id: `tr-${Date.now()}-2`, price: lastPrice - 0.2, quantity: 0.40, side: 'SELL', timestamp: Date.now() - 3400 },
        { id: `tr-${Date.now()}-3`, price: lastPrice + 0.1, quantity: 1.10, side: 'BUY', timestamp: Date.now() - 7800 },
      ],
      candles,
    };
  }

  async getWallets(): Promise<WalletBalance[]> {
    await this.simulateLatency();
    const lockedInPositions = Array.from(this.positions.values()).reduce((sum, pos) => sum + pos.margin, 0);
    const unrealizedPnL = Array.from(this.positions.values()).reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
    return [{
      currency: 'USDT',
      total: this.balance + unrealizedPnL,
      available: Math.max(0, this.balance - lockedInPositions),
      lockedInOrders: 0,
      lockedInPositions,
      unrealizedPnL,
      marginRatio: (lockedInPositions / (this.balance || 1)) * 100,
    }];
  }

  async getPositions(): Promise<Position[]> {
    await this.simulateLatency();
    return Array.from(this.positions.values());
  }

  async getOpenOrders(): Promise<OrderResult[]> {
    await this.simulateLatency();
    return Array.from(this.orders.values()).filter(o => o.status === 'OPEN');
  }

  async createOrder(request: OrderIntent): Promise<OrderResult> {
    await this.simulateLatency();
    const orderId = `mock-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const fillPrice = request.price || (request.instrument.includes('ETH') ? 3482 : request.instrument.includes('SOL') ? 153.2 : 65420);
    const notional = request.quantity * fillPrice;
    const fee = notional * 0.0005;

    const result: OrderResult = {
      id: orderId,
      clientOrderId: request.clientOrderId,
      exchangeOrderId: orderId,
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

    this.orders.set(orderId, result);

    // Update internal mock position
    const existing = this.positions.get(request.instrument);
    if (existing) {
      if (existing.side === (request.side === 'BUY' ? 'LONG' : 'SHORT')) {
        // Increase position
        const totalQty = existing.quantity + request.quantity;
        const avgPrice = ((existing.entryPrice * existing.quantity) + (fillPrice * request.quantity)) / totalQty;
        existing.quantity = totalQty;
        existing.entryPrice = avgPrice;
        existing.margin += (notional / (request.leverage || 5));
        existing.updatedAt = new Date().toISOString();
      } else {
        // Reduce or flip position
        if (existing.quantity <= request.quantity) {
          this.positions.delete(request.instrument);
        } else {
          existing.quantity -= request.quantity;
          existing.updatedAt = new Date().toISOString();
        }
      }
    } else {
      this.positions.set(request.instrument, {
        instrument: request.instrument,
        side: request.side === 'BUY' ? 'LONG' : 'SHORT',
        quantity: request.quantity,
        entryPrice: fillPrice,
        markPrice: fillPrice,
        liquidationPrice: request.side === 'BUY' ? fillPrice * 0.88 : fillPrice * 1.12,
        leverage: request.leverage || 5,
        margin: notional / (request.leverage || 5),
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        realizedPnL: -fee,
        stopLoss: request.stopLoss,
        takeProfit: request.takeProfit,
        updatedAt: new Date().toISOString(),
        isSimulated: true,
      });
    }

    return result;
  }

  async cancelOrder(request: CancelOrderRequest): Promise<CancelResult> {
    await this.simulateLatency();
    const order = this.orders.get(request.orderId);
    if (order) {
      order.status = 'CANCELLED';
      return { orderId: request.orderId, symbol: request.symbol, status: 'CANCELLED' };
    }
    return { orderId: request.orderId, symbol: request.symbol, status: 'NOT_FOUND' };
  }

  async editOrder(request: EditOrderRequest): Promise<OrderResult> {
    await this.simulateLatency();
    const order = this.orders.get(request.orderId);
    if (!order) throw new Error('Order not found');
    if (request.newPrice) order.price = request.newPrice;
    if (request.newQuantity) order.quantity = request.newQuantity;
    return order;
  }

  async exitPosition(request: ExitPositionRequest): Promise<ExitResult> {
    await this.simulateLatency();
    const pos = this.positions.get(request.symbol);
    if (!pos) {
      return { symbol: request.symbol, status: 'FAILED', executedPrice: 0, pnlRealized: 0 };
    }
    const executedPrice = pos.markPrice;
    const pnl = pos.unrealizedPnL;
    this.positions.delete(request.symbol);
    return {
      symbol: request.symbol,
      status: 'EXITED',
      executedPrice,
      pnlRealized: pnl,
    };
  }

  async reconcile(internalOrders: OrderResult[], internalPositions: Position[]): Promise<ReconciliationResult> {
    await this.simulateLatency();
    return {
      timestamp: new Date().toISOString(),
      isMatched: true,
      discrepanciesCount: 0,
      matchedPositionsCount: internalPositions.length,
      matchedOrdersCount: internalOrders.length,
      details: {
        internalOrdersCount: internalOrders.length,
        exchangeOrdersCount: internalOrders.length,
        internalPositionsCount: internalPositions.length,
        exchangePositionsCount: internalPositions.length,
        mismatches: [],
      },
    };
  }

  private async simulateLatency(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, this.latencyMs));
  }
}
