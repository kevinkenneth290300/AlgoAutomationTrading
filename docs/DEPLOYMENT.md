# Deployment & Operations Guide: Local Docker, Staging & Production

This guide covers deployment procedures across local development, staging environments, and production Cloud Run instances.

---

## 1. Local Development (One-Command Architecture)

The development environment requires zero manual infrastructure configuration.

### Option A: Docker Compose (Recommended)
Starts TimescaleDB (PostgreSQL 16), Redis 7, API, Web, and Background Worker:
```bash
docker compose up -d
```
All persistent data is stored in Docker volumes `postgres_data` and `redis_data`.

Verify containers and health:
```bash
docker compose ps
curl http://localhost:3000/api/v1/health
```

### Option B: Local Node.js Development
If running directly on your host machine:
```bash
npm install
npm run dev
```
The platform automatically detects the host environment and uses sensible development defaults:
- Default DB: `postgresql://trading:trading@localhost:5432/trading`
- Default Redis: `redis://localhost:6379`
- In-memory fallback is automatically engaged if local services are not running, preventing app crashes.

---

## 2. Staging Deployment (Google Cloud Platform)

Staging provides an isolated environment for multi-day soak testing with live exchange market data and paper trading.

### Architecture
- **API & Frontend**: Google Cloud Run (Container)
- **Background Worker**: Google Cloud Run Job or persistent worker instance
- **Database**: Google Cloud SQL for PostgreSQL 16 (with TimescaleDB extension)
- **Cache & Queues**: Google Cloud Memorystore for Redis
- **Secrets**: Google Secret Manager

### Provisioning Steps
1. **Provision Cloud SQL Instance**:
   ```bash
   gcloud sql instances create quant-staging-db \
     --database-version=POSTGRES_16 \
     --tier=db-custom-2-7680 \
     --region=asia-south1
   ```
2. **Provision Memorystore Redis**:
   ```bash
   gcloud redis instances create quant-staging-redis \
     --size=1 \
     --region=asia-south1
   ```
3. **Store Credentials in Secret Manager**:
   ```bash
   echo -n "your_coindcx_key" | gcloud secrets create staging_coindcx_api_key --data-file=-
   echo -n "your_coindcx_secret" | gcloud secrets create staging_coindcx_api_secret --data-file=-
   ```
4. **Deploy Container to Cloud Run**:
   ```bash
   gcloud run deploy quant-staging-api \
     --image=gcr.io/your-project/quant-platform:latest \
     --region=asia-south1 \
     --vpc-connector=quant-vpc-connector \
     --set-secrets=COINDCX_API_KEY=staging_coindcx_api_key:latest,COINDCX_API_SECRET=staging_coindcx_api_secret:latest \
     --set-env-vars=NODE_ENV=staging,COINDCX_ENVIRONMENT=testnet,LIVE_TRADING_ENABLED=false
   ```

---

## 3. Production Deployment (Hardened Zero-Downtime)

Production requires strict physical and logical isolation.

### Hardened Production Safeguards
1. **Static Egress IP**: All Cloud Run egress traffic must route through a Cloud NAT with a reserved static external IP address. This static IP must be whitelisted inside CoinDCX API Dashboard.
2. **Dedicated Worker Architecture**:
   - **Service 1 (API + UI)**: Handles user requests, UI streaming, and manual risk controls.
   - **Service 2 (Worker)**: Autonomous background service for orderbook ingestion, strategy evaluation, reconciliation loops, and soak testing.
3. **Rolling Deployments**: Zero-downtime rolling deploys ensure persistent background websocket connections are gracefully transferred.
4. **Disaster Recovery / Circuit Breakers**:
   - The Global Kill Switch can be engaged instantly via REST API (`POST /api/v1/risk/kill-switch`).
   - If reconciliation detects any mismatch between exchange and internal state, live ordering is automatically halted.

---

## 4. Multi-Day Soak Testing Protocol

Before promoting any strategy or software version to production:
1. Run the system continuously in **SOAK TEST MODE** for a minimum of 72 hours.
2. Monitor:
   - Memory leaks (RSS should stabilize under 250MB)
   - Queue depth (should remain near 0)
   - WebSocket reconnection latency (< 500ms)
   - Market data gap rate (must be 0)
3. Download the **Paper Trading Report** (`GET /api/v1/system/soak-test`) to evaluate statistical execution validity.
