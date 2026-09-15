# Alpha Quantitative Trading & Research Platform (CoinDCX Futures)

A production-grade, institutional full-stack platform for quantitative cryptocurrency research, strategy discovery, event-driven backtesting, statistical validation, continuous paper trading, risk governance, and controlled live execution via the official **CoinDCX Futures API**.

---

## 1. Architectural Highlights

- **Single Execution Exchange**: Exclusively trades **CoinDCX Futures** derivatives based on the official [CoinDCX API documentation](https://docs.coindcx.com/).
- **Independent Research Domains**: U.S. Equities pre-market research and Cryptocurrency Futures engines are strictly separated. No cross-market leakage.
- **Autonomous Self-Configuration**: No manual typing of database URLs or risk parameters is required. Boots automatically with sensible defaults (`docker compose up`).
- **Strict Execution Pipeline**:
  $$\text{Strategy} \longrightarrow \text{Signal} \longrightarrow \text{Risk Engine} \longrightarrow \text{Order Intent} \longrightarrow \text{Idempotency Check} \longrightarrow \text{CoinDCX Adapter} \longrightarrow \text{Exchange} \longrightarrow \text{Reconciliation}$$
- **Zero Secret Exposure**: All API keys and secrets (`COINDCX_API_KEY`, `COINDCX_API_SECRET`, `GEMINI_API_KEY`) remain strictly on the server.
- **Production Rate Limiting**: Centralized Token Bucket limiter strictly enforcing **16 req/sec** burst and **960 req/min** sustained with circuit breakers and exponential backoff.
- **Continuous Multi-Day Soak Testing**: Background workers evaluate strategies, monitor memory, and reconcile state continuously without requiring a browser tab open.

---

## 2. One-Command Development

Run the full platform with all backing services (PostgreSQL 16 / TimescaleDB, Redis 7, API, UI, and Background Worker):

```bash
# Starts all services with health checks and persistent volumes
docker compose up -d
```

Open your browser to:
```
http://localhost:3000
```

To run directly on host using Node.js:
```bash
npm install
npm run dev
```

---

## 3. Safe Development Defaults

The platform automatically configures conservative defaults to prevent unintentional financial exposure:
- **Maximum Leverage**: `1x` (Conservative dev default)
- **Maximum Daily Loss**: `$50 USDT`
- **Maximum Position Notional**: `$100 USDT`
- **Maximum Concurrent Positions**: `1`
- **Execution Mode**: `RESEARCH` (Live trading permanently locked with `LIVE_TRADING_ENABLED=false`)

---

## 4. CoinDCX Futures Integration & Verification

1. Provision API credentials from the [CoinDCX API Dashboard](https://coindcx.com).
2. Set them in your server environment:
   ```bash
   COINDCX_API_KEY=your_key
   COINDCX_API_SECRET=your_secret
   COINDCX_ENVIRONMENT=testnet
   ```
3. In the UI, click **Config** (or open **Settings → Exchange → CoinDCX**) and click **Test CoinDCX Connection**.
4. The system executes a safe 8-step read-only verification:
   - Credentials Check
   - Authentication Verification
   - Dynamic Instrument Discovery
   - Wallet Read
   - Open Positions Read
   - Open Orders Read
   - Market Data Feed Sanity
   - Continuous Reconciliation

---

## 5. Documentation Directory

- **CoinDCX API Setup & Security**: [`docs/COINDCX_API_SETUP.md`](docs/COINDCX_API_SETUP.md)
- **Staging & Production Deployment**: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- **24-Point Production Readiness Checklist**: [`docs/PRODUCTION_CHECKLIST.md`](docs/PRODUCTION_CHECKLIST.md)

---

## 6. Testing & Compilation

```bash
# Run automated test suite (Indicators, Features, Signer, Risk Engine, Orders)
npm test

# Verify production build compilation
npm run build
```

---

## 7. Operational Modes

| Mode | Orders Allowed? | Live CoinDCX Placement? | Purpose |
| :--- | :--- | :--- | :--- |
| **RESEARCH** | ❌ No | ❌ No | Strategy design, feature calculation, hypothesis testing (Default) |
| **BACKTEST** | ❌ No | ❌ No | Historical event-driven simulations with slippage & latency |
| **PAPER** | ✅ Simulated | ❌ No | Real-time paper execution using live orderbook & Risk Engine |
| **LIVE_ARMED** | ⚠️ Operator Confirm | ⚠️ Arming | Temporary armed state requiring 2-step verification |
| **LIVE** | ✅ Live Real | ✅ Real Futures | Controlled live execution via CoinDCX Adapter (Locked by default) |
