-- PRODUCTION QUANTITATIVE TRADING & RESEARCH PLATFORM
-- Schema Migration 001: Core Architecture & TimescaleDB Data Models

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(128) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'RESEARCHER',
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_credentials_metadata (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id),
    exchange_name VARCHAR(64) NOT NULL,
    key_identifier VARCHAR(32) NOT NULL, -- Masked identifier only
    environment VARCHAR(32) NOT NULL DEFAULT 'testnet',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS instruments (
    symbol VARCHAR(64) PRIMARY KEY,
    pair VARCHAR(64) NOT NULL,
    base_currency VARCHAR(16) NOT NULL,
    quote_currency VARCHAR(16) NOT NULL,
    settlement_currency VARCHAR(16) NOT NULL,
    contract_type VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    min_quantity NUMERIC(18, 8) NOT NULL,
    max_quantity NUMERIC(18, 8) NOT NULL,
    step_size NUMERIC(18, 8) NOT NULL,
    tick_size NUMERIC(18, 8) NOT NULL,
    min_notional NUMERIC(18, 4) NOT NULL,
    max_leverage INT NOT NULL,
    maker_fee_rate NUMERIC(8, 6) NOT NULL,
    taker_fee_rate NUMERIC(8, 6) NOT NULL,
    current_price NUMERIC(18, 8),
    mark_price NUMERIC(18, 8),
    index_price NUMERIC(18, 8),
    funding_rate NUMERIC(10, 8),
    open_interest NUMERIC(24, 8),
    volume_24h NUMERIC(24, 4),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candles (
    instrument VARCHAR(64) NOT NULL REFERENCES instruments(symbol),
    timeframe VARCHAR(16) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    open NUMERIC(18, 8) NOT NULL,
    high NUMERIC(18, 8) NOT NULL,
    low NUMERIC(18, 8) NOT NULL,
    close NUMERIC(18, 8) NOT NULL,
    volume NUMERIC(24, 8) NOT NULL,
    trades INT,
    vwap NUMERIC(18, 8),
    PRIMARY KEY (instrument, timeframe, timestamp)
);

CREATE TABLE IF NOT EXISTS news_events (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    source VARCHAR(128) NOT NULL,
    source_url TEXT,
    symbol VARCHAR(64),
    event_type VARCHAR(64) NOT NULL,
    headline TEXT NOT NULL,
    summary TEXT,
    sentiment NUMERIC(6, 4) NOT NULL,
    severity NUMERIC(6, 4) NOT NULL,
    confidence NUMERIC(6, 4) NOT NULL,
    novelty NUMERIC(6, 4) NOT NULL,
    materiality_score NUMERIC(6, 4) NOT NULL
);

CREATE TABLE IF NOT EXISTS strategies (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    version VARCHAR(32) NOT NULL,
    market VARCHAR(32) NOT NULL,
    instrument VARCHAR(64) NOT NULL,
    timeframe VARCHAR(16) NOT NULL,
    lifecycle_status VARCHAR(32) NOT NULL DEFAULT 'DISCOVERED',
    description TEXT,
    parameters JSONB NOT NULL DEFAULT '{}',
    required_features TEXT[] NOT NULL DEFAULT '{}',
    validation_score NUMERIC(6, 2),
    out_of_sample_score NUMERIC(6, 2),
    max_drawdown_percent NUMERIC(6, 2),
    win_rate_percent NUMERIC(6, 2),
    sharpe_ratio NUMERIC(6, 2),
    health_status VARCHAR(32) NOT NULL DEFAULT 'HEALTHY',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS backtests (
    id VARCHAR(64) PRIMARY KEY,
    strategy_id VARCHAR(64) NOT NULL REFERENCES strategies(id),
    strategy_version VARCHAR(32) NOT NULL,
    instrument VARCHAR(64) NOT NULL,
    timeframe VARCHAR(16) NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    starting_capital NUMERIC(18, 4) NOT NULL,
    ending_capital NUMERIC(18, 4) NOT NULL,
    net_profit NUMERIC(18, 4) NOT NULL,
    total_return_percent NUMERIC(10, 4) NOT NULL,
    cagr NUMERIC(10, 4),
    sharpe_ratio NUMERIC(6, 2),
    sortino_ratio NUMERIC(6, 2),
    calmar_ratio NUMERIC(6, 2),
    max_drawdown_percent NUMERIC(6, 2) NOT NULL,
    profit_factor NUMERIC(6, 2) NOT NULL,
    win_rate NUMERIC(6, 2) NOT NULL,
    total_trades INT NOT NULL,
    parameters JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS validation_runs (
    id VARCHAR(64) PRIMARY KEY,
    backtest_id VARCHAR(64) REFERENCES backtests(id),
    strategy_id VARCHAR(64) REFERENCES strategies(id),
    validation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    overall_score NUMERIC(6, 2) NOT NULL,
    overall_verdict VARCHAR(16) NOT NULL,
    in_sample_backtest VARCHAR(16) NOT NULL,
    out_of_sample VARCHAR(16) NOT NULL,
    walk_forward VARCHAR(16) NOT NULL,
    parameter_stability VARCHAR(16) NOT NULL,
    monte_carlo VARCHAR(16) NOT NULL,
    fee_stress VARCHAR(16) NOT NULL,
    slippage_stress VARCHAR(16) NOT NULL,
    regime_stability VARCHAR(16) NOT NULL,
    sample_size VARCHAR(16) NOT NULL,
    metrics JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS paper_orders (
    id VARCHAR(64) PRIMARY KEY,
    client_order_id VARCHAR(64) UNIQUE NOT NULL,
    strategy_id VARCHAR(64) REFERENCES strategies(id),
    instrument VARCHAR(64) NOT NULL,
    side VARCHAR(16) NOT NULL,
    quantity NUMERIC(18, 8) NOT NULL,
    executed_quantity NUMERIC(18, 8) NOT NULL,
    price NUMERIC(18, 8),
    avg_fill_price NUMERIC(18, 8),
    status VARCHAR(32) NOT NULL,
    fee NUMERIC(18, 8) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS risk_decisions (
    id VARCHAR(64) PRIMARY KEY,
    order_intent_id VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(32) NOT NULL,
    reasons TEXT[] NOT NULL DEFAULT '{}',
    checks_passed TEXT[] NOT NULL DEFAULT '{}',
    checks_failed TEXT[] NOT NULL DEFAULT '{}',
    metrics_snapshot JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS audit_events (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor VARCHAR(128) NOT NULL,
    action VARCHAR(64) NOT NULL,
    entity VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    request_id VARCHAR(64),
    correlation_id VARCHAR(64),
    result VARCHAR(32) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_candles_instrument_time ON candles(instrument, timeframe, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_time ON audit_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_risk_decisions_time ON risk_decisions(timestamp DESC);
