import { RiskEngine } from '../../server/risk/riskEngine.ts';
import { OrderIntent, Instrument, Position } from '../../server/types/quant.ts';

function runRiskEngineTests() {
  console.log('Starting RiskEngine Unit Tests...');
  const riskEngine = new RiskEngine();

  const dummyInstrument: Instrument = {
    symbol: 'B-BTC_USDT',
    pair: 'BTCUSDT',
    baseCurrency: 'BTC',
    quoteCurrency: 'USDT',
    settlementCurrency: 'USDT',
    contractType: 'PERPETUAL_FUTURES',
    status: 'ACTIVE',
    minQuantity: 0.001,
    maxQuantity: 100,
    stepSize: 0.001,
    tickSize: 0.1,
    minNotional: 5,
    maxLeverage: 20,
    supportedOrderTypes: ['MARKET', 'LIMIT'],
    makerFeeRate: 0.0002,
    takerFeeRate: 0.0005,
    currentPrice: 65000,
    markPrice: 65005,
    indexPrice: 65000,
    fundingRate: 0.0001,
    nextFundingTime: new Date().toISOString(),
    openInterest: 100000,
    volume24h: 50000000,
    priceChange24h: 2.5,
    high24h: 66000,
    low24h: 64000,
    lastUpdated: new Date().toISOString(),
  };

  const validIntent: OrderIntent = {
    id: 'test-intent-1',
    clientOrderId: 'cl-1',
    strategyId: 'btc_momentum_v12',
    strategyVersion: 'v12.4.0',
    signalId: 'sig-1',
    instrument: 'B-BTC_USDT',
    side: 'BUY',
    quantity: 0.05,
    orderType: 'MARKET',
    price: 65000,
    leverage: 5,
    marginType: 'ISOLATED',
    reduceOnly: false,
    createdAt: new Date().toISOString(),
  };

  // Test 1: Kill switch activation blocks orders
  riskEngine.setKillSwitch(true, 'Test Kill Switch');
  const decision1 = riskEngine.evaluate(validIntent, undefined, dummyInstrument, [], 'ACTIVE');
  if (decision1.status !== 'DENY') {
    throw new Error('Test 1 Failed: Kill switch did not deny order');
  }
  console.log('✓ Test 1 Passed: Kill switch unconditionally denies order intent');

  // Disarm kill switch
  riskEngine.setKillSwitch(false);

  // Test 2: In RESEARCH mode, order execution is blocked
  const decisionResearch = riskEngine.evaluate(validIntent, undefined, dummyInstrument, [], 'ACTIVE');
  if (decisionResearch.status !== 'DENY') {
    throw new Error('Test 2 Failed: Order should be denied in RESEARCH mode');
  }
  console.log('✓ Test 2 Passed: Research mode safety gate strictly denies live execution');

  // Test 3: In PAPER mode with sized quantity, compliant order intent is ALLOWED
  riskEngine.setMode('PAPER');
  riskEngine.updateConfig({ maxPositionNotional: 10000 });
  const paperIntent: OrderIntent = {
    ...validIntent,
    quantity: 0.02, // 0.02 * 65000 = $1,300 <= $10,000
  };
  const decisionPaper = riskEngine.evaluate(paperIntent, undefined, dummyInstrument, [], 'ACTIVE');
  if (decisionPaper.status !== 'ALLOW') {
    throw new Error(`Test 3 Failed: Valid paper intent denied: ${decisionPaper.reasons.join(', ')}`);
  }
  console.log('✓ Test 3 Passed: Compliant order intent passed all risk checks in PAPER mode');

  // Test 4: Excessive leverage is denied
  const excessiveLeverageIntent: OrderIntent = {
    ...paperIntent,
    leverage: 25, // instrument max is 20
  };
  const decision4 = riskEngine.evaluate(excessiveLeverageIntent, undefined, dummyInstrument, [], 'ACTIVE');
  if (decision4.status !== 'DENY') {
    throw new Error('Test 4 Failed: Excessive leverage was not denied');
  }
  console.log('✓ Test 4 Passed: Leverage limit enforced against instrument constraints');

  // Test 5: Excessive notional value is denied
  const excessiveNotionalIntent: OrderIntent = {
    ...paperIntent,
    quantity: 2.0, // 2 * 65000 = $130,000 > $10,000 cap
  };
  const decision5 = riskEngine.evaluate(excessiveNotionalIntent, undefined, dummyInstrument, [], 'ACTIVE');
  if (decision5.status !== 'DENY') {
    throw new Error('Test 5 Failed: Excessive notional was not denied');
  }
  console.log('✓ Test 5 Passed: Maximum position notional limit enforced');

  console.log('All RiskEngine tests passed successfully!\n');
}

runRiskEngineTests();
