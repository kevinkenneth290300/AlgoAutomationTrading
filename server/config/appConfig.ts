import fs from 'fs';
import path from 'path';

export type AppEnvironment = 'development' | 'staging' | 'production';

export interface RiskConfig {
  maxDailyLoss: number; // in USDT
  maxPositionNotional: number; // in USDT
  maxLeverage: number;
  maxConcurrentPositions: number;
  maxOrderRatePerMinute: number;
  maxSignalAgeSeconds: number;
  maxMarketDataAgeSeconds: number;
  isDevelopmentDefault: boolean;
}

export interface CoinDcxRateLimitConfig {
  requestsPerSecond: number;
  requestsPerMinute: number;
}

export interface AppConfig {
  environment: AppEnvironment;
  runtimePlatform: 'docker' | 'host' | 'ai_studio' | 'cloud_run';
  tradingMode: 'RESEARCH' | 'BACKTEST' | 'PAPER' | 'LIVE_DISABLED' | 'LIVE_ARMED' | 'LIVE';
  liveTradingEnabled: boolean;
  port: number;
  logLevel: string;
  database: {
    url: string;
    isAutoProvisioned: boolean;
    provider: 'postgresql' | 'in_memory_fallback';
  };
  redis: {
    url: string;
    isAutoProvisioned: boolean;
    provider: 'redis' | 'in_process_fallback';
  };
  risk: RiskConfig;
  coindcx: {
    apiKeyConfigured: boolean;
    apiSecretConfigured: boolean;
    environment: 'production' | 'testnet';
    rateLimits: CoinDcxRateLimitConfig;
  };
  gemini: {
    isConfigured: boolean;
    source: 'ai_studio_managed' | 'environment_secret' | 'none';
  };
}

class ConfigurationManager {
  private static instance: ConfigurationManager;
  private config: AppConfig;

  private constructor() {
    this.config = this.resolveConfiguration();
    this.logStartupSanity();
  }

  public static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  public getConfig(): Readonly<AppConfig> {
    return this.config;
  }

  public updateRiskConfig(updates: Partial<Omit<RiskConfig, 'isDevelopmentDefault'>>): RiskConfig {
    this.config.risk = {
      ...this.config.risk,
      ...updates,
      isDevelopmentDefault: false,
    };
    return this.config.risk;
  }

  private detectRuntimePlatform(): 'docker' | 'host' | 'ai_studio' | 'cloud_run' {
    if (process.env.K_SERVICE || process.env.CLOUD_RUN_JOB) {
      return 'cloud_run';
    }
    if (process.env.AIS_PROJECT_ID || process.env.AI_STUDIO_APPLET || process.env.APP_URL?.includes('run.app')) {
      return 'ai_studio';
    }
    // Check if running inside Docker container
    try {
      if (fs.existsSync('/.dockerenv') || fs.existsSync('/run/.containerenv')) {
        return 'docker';
      }
    } catch {
      // Fall through
    }
    return 'host';
  }

  private resolveConfiguration(): AppConfig {
    const rawEnv = (process.env.NODE_ENV || 'development').toLowerCase();
    const environment: AppEnvironment = 
      rawEnv === 'production' ? 'production' :
      rawEnv === 'staging' ? 'staging' : 'development';

    const runtimePlatform = this.detectRuntimePlatform();

    // 1. Database Resolution:
    // User does NOT need to invent random values.
    // In Docker -> postgresql://trading:trading@postgres:5432/trading
    // On Host -> postgresql://trading:trading@localhost:5432/trading
    // In AI Studio without external DB -> In-memory structured fallback with alert
    let defaultDbUrl: string;
    let dbProvider: 'postgresql' | 'in_memory_fallback' = 'postgresql';

    if (process.env.DATABASE_URL) {
      defaultDbUrl = process.env.DATABASE_URL;
    } else if (runtimePlatform === 'docker') {
      defaultDbUrl = 'postgresql://trading:trading@postgres:5432/trading';
    } else if (runtimePlatform === 'host') {
      defaultDbUrl = 'postgresql://trading:trading@localhost:5432/trading';
    } else {
      // AI Studio or Cloud Run without explicit DATABASE_URL
      defaultDbUrl = 'postgresql://trading:trading@localhost:5432/trading';
      dbProvider = 'in_memory_fallback';
    }

    // 2. Redis Resolution:
    // In Docker -> redis://redis:6379
    // On Host -> redis://localhost:6379
    let defaultRedisUrl: string;
    let redisProvider: 'redis' | 'in_process_fallback' = 'redis';

    if (process.env.REDIS_URL) {
      defaultRedisUrl = process.env.REDIS_URL;
    } else if (runtimePlatform === 'docker') {
      defaultRedisUrl = 'redis://redis:6379';
    } else if (runtimePlatform === 'host') {
      defaultRedisUrl = 'redis://localhost:6379';
    } else {
      defaultRedisUrl = 'redis://localhost:6379';
      redisProvider = 'in_process_fallback';
    }

    // 3. Conservative Development Risk Defaults:
    // MAX_LEVERAGE=1
    // MAX_DAILY_LOSS_USDT=50
    // MAX_POSITION_NOTIONAL_USDT=100
    // MAX_CONCURRENT_POSITIONS=1
    const isExplicitRiskProvided = Boolean(
      process.env.MAX_LEVERAGE || 
      process.env.MAX_DAILY_LOSS || 
      process.env.MAX_DAILY_LOSS_USDT ||
      process.env.MAX_POSITION_NOTIONAL ||
      process.env.MAX_POSITION_NOTIONAL_USDT
    );

    const maxDailyLoss = Number(process.env.MAX_DAILY_LOSS_USDT || process.env.MAX_DAILY_LOSS || 50);
    const maxPositionNotional = Number(process.env.MAX_POSITION_NOTIONAL_USDT || process.env.MAX_POSITION_NOTIONAL || 100);
    const maxLeverage = Number(process.env.MAX_LEVERAGE || 1);
    const maxConcurrentPositions = Number(process.env.MAX_CONCURRENT_POSITIONS || 1);

    const risk: RiskConfig = {
      maxDailyLoss,
      maxPositionNotional,
      maxLeverage,
      maxConcurrentPositions,
      maxOrderRatePerMinute: 10,
      maxSignalAgeSeconds: 60,
      maxMarketDataAgeSeconds: 30,
      isDevelopmentDefault: !isExplicitRiskProvided && environment === 'development',
    };

    // 4. CoinDCX Configuration:
    const hasApiKey = Boolean(process.env.COINDCX_API_KEY && process.env.COINDCX_API_KEY.trim().length > 0);
    const hasApiSecret = Boolean(process.env.COINDCX_API_SECRET && process.env.COINDCX_API_SECRET.trim().length > 0);
    
    // Official documentation rates: 16 req/sec, 960 req/min
    const requestsPerSecond = Number(process.env.COINDCX_REQUESTS_PER_SECOND || 16);
    const requestsPerMinute = Number(process.env.COINDCX_REQUESTS_PER_MINUTE || 960);

    // 5. Gemini AI Configuration:
    const geminiKey = process.env.GEMINI_API_KEY;
    const isGeminiConfigured = Boolean(geminiKey && geminiKey.trim().length > 0 && geminiKey !== 'MY_GEMINI_API_KEY');

    return {
      environment,
      runtimePlatform,
      tradingMode: 'RESEARCH',
      liveTradingEnabled: false, // Strict default: NEVER enable live trading automatically
      port: Number(process.env.PORT || 3000),
      logLevel: process.env.LOG_LEVEL || 'info',
      database: {
        url: defaultDbUrl,
        isAutoProvisioned: !process.env.DATABASE_URL,
        provider: dbProvider,
      },
      redis: {
        url: defaultRedisUrl,
        isAutoProvisioned: !process.env.REDIS_URL,
        provider: redisProvider,
      },
      risk,
      coindcx: {
        apiKeyConfigured: hasApiKey,
        apiSecretConfigured: hasApiSecret,
        environment: (process.env.COINDCX_ENVIRONMENT === 'production' ? 'production' : 'testnet'),
        rateLimits: {
          requestsPerSecond,
          requestsPerMinute,
        },
      },
      gemini: {
        isConfigured: isGeminiConfigured,
        source: runtimePlatform === 'ai_studio' ? 'ai_studio_managed' : (isGeminiConfigured ? 'environment_secret' : 'none'),
      },
    };
  }

  private logStartupSanity(): void {
    console.log(`================================================================`);
    console.log(`ALPHA QUANT & COINDCX FUTURES TERMINAL — CONFIGURATION ACTIVE`);
    console.log(`Environment:      ${this.config.environment.toUpperCase()}`);
    console.log(`Platform Mode:    ${this.config.runtimePlatform}`);
    console.log(`Trading Mode:     ${this.config.tradingMode} (Default Safety Locked)`);
    console.log(`Live Execution:   DISABLED (LIVE_TRADING_ENABLED=false)`);
    console.log(`PostgreSQL:       ${this.config.database.isAutoProvisioned ? 'AUTO-PROVISIONED LOCAL DEFAULT' : 'CUSTOM URL'} (${this.config.database.url.replace(/:[^:@]+@/, ':****@')})`);
    console.log(`Redis:            ${this.config.redis.isAutoProvisioned ? 'AUTO-PROVISIONED LOCAL DEFAULT' : 'CUSTOM URL'} (${this.config.redis.url})`);
    console.log(`Risk Policy:      ${this.config.risk.isDevelopmentDefault ? 'SAFE DEVELOPMENT DEFAULTS ACTIVE' : 'CUSTOM RISK LIMITS'}`);
    console.log(`  Max Leverage:   ${this.config.risk.maxLeverage}x (Development-safe default: 1x)`);
    console.log(`  Max Daily Loss: $${this.config.risk.maxDailyLoss} USDT`);
    console.log(`  Max Notional:   $${this.config.risk.maxPositionNotional} USDT`);
    console.log(`CoinDCX Rate:     ${this.config.coindcx.rateLimits.requestsPerSecond} req/s | ${this.config.coindcx.rateLimits.requestsPerMinute} req/min`);
    console.log(`================================================================`);
  }
}

export const appConfig = ConfigurationManager.getInstance().getConfig();
export const configManager = ConfigurationManager.getInstance();
