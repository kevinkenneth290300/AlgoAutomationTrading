# Production Deployment Readiness Checklist (24 Gates)

Before enabling `LIVE_TRADING_ENABLED=true` or transitioning from `RESEARCH` or `PAPER` mode into `LIVE_ARMED`, every single gate in this checklist must be verified and signed off by the Operations and Quantitative Risk teams.

---

## Section 1: Security & Credentials Governance
- [ ] **Gate 1: Zero Secret Exposure**: Confirm `COINDCX_API_SECRET` and `GEMINI_API_KEY` are stored strictly in Google Secret Manager or server-side environment variables. Ensure no secrets are bundled in frontend assets or checked into Git.
- [ ] **Gate 2: Static IP Whitelisting**: Confirm CoinDCX API credentials have IP binding enabled, restricted exclusively to the VPC NAT static egress IP.
- [ ] **Gate 3: Principle of Least Privilege**: Verify API key permissions on CoinDCX are restricted to Futures Trading only (withdrawals permanently disabled).
- [ ] **Gate 4: Non-Root Execution**: Verify the Docker container executes as non-root user `appuser` (UID 1001).

---

## Section 2: Exchange Adapter & Rate Limiting
- [ ] **Gate 5: Rate Limiter Enforced**: Verify Token Bucket limiter enforces maximum 16 req/sec and 960 req/min.
- [ ] **Gate 6: Order Timeout Safety**: Verify that order submission failure NEVER triggers an automatic blind retry. Reconcile first.
- [ ] **Gate 7: Safe Read-Only Test Passed**: Execute `POST /api/v1/coindcx/test-connection` and verify all 8 validation steps return `PASS`.
- [ ] **Gate 8: Dynamic Instrument Discovery**: Verify active instruments are dynamically discovered from CoinDCX and stored in PostgreSQL.

---

## Section 3: Risk Engine & Safety Gates
- [ ] **Gate 9: Global Kill Switch**: Test emergency kill switch (`POST /api/v1/risk/kill-switch`). Confirm all live order generation halts immediately.
- [ ] **Gate 10: Maximum Daily Loss**: Verify that accumulating loss beyond `MAX_DAILY_LOSS` immediately blocks further orders.
- [ ] **Gate 11: Maximum Leverage Cap**: Verify maximum leverage cannot exceed configured threshold (Default 1x dev, strict 2x–5x prod).
- [ ] **Gate 12: Position Notional Cap**: Verify position size is strictly bounded by `MAX_POSITION_NOTIONAL`.
- [ ] **Gate 13: Order Rate Throttle**: Confirm risk engine blocks orders exceeding maximum order rate per minute.
- [ ] **Gate 14: Order Preview Confirmation**: Ensure UI requires explicit 2-step operator confirmation before submitting any live order intent.

---

## Section 4: Quantitative Strategy Validation
- [ ] **Gate 15: Out-of-Sample (OOS) Validation**: Strategy must pass OOS testing with Sharpe Ratio > 1.5 and profit factor > 1.4.
- [ ] **Gate 16: Walk-Forward Analysis**: Strategy must maintain parameter stability across rolling test windows.
- [ ] **Gate 17: Monte Carlo Trade Reshuffling**: Strategy must pass 1,000-run Monte Carlo drawdowns without catastrophic liquidation risk.
- [ ] **Gate 18: No Cross-Market Signal Leakage**: Verify U.S. Equities Research is strictly isolated from crypto futures signals.

---

## Section 5: Infrastructure & Continuous Reconciliation
- [ ] **Gate 19: Continuous Reconciliation**: Verify reconciliation engine checks internal orders/positions against exchange state every 15 seconds.
- [ ] **Gate 20: Database Schema Migrations**: Ensure all SQL migrations (`001_initial_schema.sql`) have been applied cleanly to TimescaleDB.
- [ ] **Gate 21: Multi-Day Soak Test**: Platform must run continuously in background mode for at least 72 hours without memory leaks, worker crashes, or unhandled exceptions.
- [ ] **Gate 22: Redis Queue Health**: Confirm queue depths remain near zero and BullMQ job processing latency is < 100ms.
- [ ] **Gate 23: Complete Audit Ledger**: Confirm every signal, order intent, risk decision, and configuration modification is recorded in `audit_events`.
- [ ] **Gate 24: Default Safe State**: Confirm platform boots into `RESEARCH` mode with `LIVE_TRADING_ENABLED=false` until explicitly armed.
