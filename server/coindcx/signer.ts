import crypto from 'crypto';

export interface CoinDcxCredentials {
  apiKey: string;
  apiSecret: string;
}

export interface SignedHeaders {
  'X-AUTH-APIKEY': string;
  'X-AUTH-SIGNATURE': string;
  'Content-Type': string;
}

/**
 * Generates an HMAC-SHA256 signature for CoinDCX API requests.
 * @param secret The secret API key (kept strictly on server)
 * @param payload The request body serialized as a string or empty string
 * @returns Hex-encoded HMAC SHA256 string
 */
export function signCoinDcxPayload(secret: string, payload: string | object = ''): string {
  if (!secret) {
    throw new Error('CoinDCX API secret is missing. Cannot sign request.');
  }

  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadString);
  return hmac.digest('hex');
}

/**
 * Builds standard signed request headers for CoinDCX private endpoints.
 */
export function buildCoinDcxHeaders(credentials: CoinDcxCredentials, body: object | string = ''): SignedHeaders {
  if (!credentials.apiKey) {
    throw new Error('CoinDCX API Key is required for signed requests.');
  }
  const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
  const signature = signCoinDcxPayload(credentials.apiSecret, bodyString);

  return {
    'X-AUTH-APIKEY': credentials.apiKey,
    'X-AUTH-SIGNATURE': signature,
    'Content-Type': 'application/json',
  };
}

/**
 * Validates whether the API credentials adhere to security formatting.
 * Masks secrets for any logging or audit records.
 */
export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '****';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}
