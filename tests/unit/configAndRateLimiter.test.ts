import { appConfig, configManager } from '../../server/config/appConfig.ts';
import { coinDcxRateLimiter } from '../../server/coindcx/rateLimiter.ts';
import { DatabaseInitializer } from '../../server/database/dbInit.ts';
import { RedisInitializer } from '../../server/queue/redisInit.ts';

function runConfigAndRateLimiterTests() {
  console.log('Starting Config & Rate Limiter Unit Tests...');

  // 1. AppConfig Tests
  if (!appConfig.environment) {
    throw new Error('Config Test 1 Failed: Environment not detected');
  }
  if (appConfig.liveTradingEnabled !== false) {
    throw new Error('Config Test 2 Failed: Live trading should be FALSE by default');
  }
  if (!appConfig.risk || appConfig.risk.maxLeverage < 1) {
    throw new Error('Config Test 3 Failed: Invalid default risk parameters');
  }
  console.log('✓ Configuration Manager: Auto-detected environment and applied conservative defaults.');

  // 2. Rate Limiter Tests
  const initialMetrics = coinDcxRateLimiter.getMetrics();
  if (initialMetrics.tokensPerSecRemaining <= 0) {
    throw new Error('Rate Limiter Test 1 Failed: Tokens per second empty at start');
  }
  if (initialMetrics.circuitBreakerTripped) {
    throw new Error('Rate Limiter Test 2 Failed: Circuit breaker should start disarmed');
  }
  console.log(`✓ Rate Limiter: Initialized with ${initialMetrics.tokensPerSecRemaining} tokens/sec, circuit breaker normal.`);

  // 3. Database & Redis Initializers
  const dbStatus = DatabaseInitializer.getStatus();
  if (!dbStatus.status) {
    throw new Error('Database Init Test Failed: Missing status');
  }

  const redisStatus = RedisInitializer.getStatus();
  if (!redisStatus.status) {
    throw new Error('Redis Init Test Failed: Missing status');
  }
  console.log(`✓ Database & Redis Initializers: DB [${dbStatus.status}], Redis [${redisStatus.status}].`);

  console.log('✓ ALL CONFIG & RATE LIMITER TESTS PASSED');
}

runConfigAndRateLimiterTests();
