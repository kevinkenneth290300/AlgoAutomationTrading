# CoinDCX Futures API Integration & Security Guide

This document outlines the architecture, authentication security, rate limiting, and operation of the CoinDCX Futures Exchange Adapter for the Alpha Quantitative Trading Platform.

---

## 1. Official Documentation Reference

Always consult the official CoinDCX documentation as the single source of truth:
- **Official Documentation**: [https://docs.coindcx.com/](https://docs.coindcx.com/)
- **Futures API Base URL**: `https://api.coindcx.com/exchange/v1/derivatives/futures`
- **Public Market Data Base URL**: `https://public.coindcx.com/market_data`

---

## 2. API Key Creation Instructions

Follow these step-by-step procedures to provision your API credentials:

1. Log in to your verified account on [CoinDCX](https://coindcx.com).
2. Navigate to **Profile / Account Settings** → **API Dashboard**.
3. Click **Create API Key**.
4. Assign an identifiable label:
   - For development/testing: `QuantResearch-Development`
   - For staging/production: `QuantResearch-Production`
5. **Permissions**:
   - For Research & Paper mode: Enable **Read-Only** permissions (`market_data`, `order_history`, `balances`).
   - For Live execution (when armed): Enable **Futures Trading** permissions.
6. **IP Binding (Crucial Security Layer)**:
   - Bind the API key strictly to your server's static egress IP address (e.g., Cloud NAT IP or VPC Static Egress IP).
7. Complete Two-Factor Authentication (Email OTP + Google Authenticator / SMS).
8. Copy both the **API Key** and **API Secret** immediately. CoinDCX will never display the secret key again.
9. Store the credentials directly in your server-side environment or Cloud Secret Manager:
   ```bash
   COINDCX_API_KEY=your_api_key_here
   COINDCX_API_SECRET=your_api_secret_here
   COINDCX_ENVIRONMENT=testnet # or production
   ```

---

## 3. Strict Security Rules (Zero Secret Exposure)

1. **Server-Side Exclusivity**: Secrets must remain strictly server-side.
2. **Never Expose to React**: Under no circumstances should `COINDCX_API_SECRET` be bundled in client JavaScript, stored in `localStorage`, or rendered in the DOM.
3. **No Secret In UI**: The Settings and System UI will only display `CONFIGURED` or `NOT_CONFIGURED` badges.
4. **Redacted Logs**: The Audit Logger and stdout redacts any substrings matching API secrets.

---

## 4. HMAC-SHA256 Signing Module

The CoinDCX API requires request authentication via HMAC-SHA256.

- **Centralized Signer**: Implemented in `/server/coindcx/signer.ts`.
- **Payload Construction**:
  ```ts
  const timestamp = Date.now();
  const bodyString = JSON.stringify(body);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(bodyString)
    .digest('hex');
  ```
- **Required Headers**:
  - `X-AUTH-APIKEY`: Your API Key
  - `X-AUTH-SIGNATURE`: The computed HMAC-SHA256 signature
  - `Content-Type`: `application/json`

---

## 5. Rate Limiting Architecture

The platform includes a token-bucket rate limiter (`/server/coindcx/rateLimiter.ts`):
- **Burst Capacity**: 16 requests / second
- **Sustained Capacity**: 960 requests / minute
- **Token Bucket Algorithm**: Smooths request pacing across time.
- **Exponential Backoff with Jitter**: Automatically applied on transient `429 Too Many Requests` or `5xx Server Error` for read operations.
- **Circuit Breaker**: Automatically trips after 6 consecutive failures, pausing requests for 15 seconds.

### ⚠️ Critical Order Submission Rule:
> **NEVER blindly retry an order submission if a network timeout occurs!**
> Blind retries cause catastrophic duplicate order submissions. Instead, immediately trigger the **Reconciliation Engine** (`reconcile()`) to verify if the order was matched or placed on the exchange book before taking any action.

---

## 6. Safe Connection Verification

Before placing live trades or starting multi-day soak tests, run the Safe Read-Only Verification sequence in **Settings → Exchange → Test CoinDCX Connection**:

1. **Credentials Check**: Verifies API Key & Secret are loaded in environment.
2. **Auth Test**: Validates HMAC signature against public capability endpoints.
3. **Instrument Discovery**: Dynamically queries active futures contracts.
4. **Wallet Read**: Confirms account balances can be safely read.
5. **Position Read**: Verifies open position telemetry.
6. **Open Orders Read**: Checks active limit orders.
7. **Market Data Test**: Validates live candlestick streams.
8. **Reconciliation**: Verifies synchronization between internal state and exchange state.
