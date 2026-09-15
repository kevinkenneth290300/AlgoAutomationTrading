import { signCoinDcxPayload, buildCoinDcxHeaders, maskApiKey } from '../../server/coindcx/signer.ts';

export function runSignerTests() {
  const mockSecret = 'test_secret_key_1234567890';
  const mockApiKey = 'test_api_key_abcdef123456';
  const payload = { timestamp: 1718000000000, side: 'buy', order_type: 'market_order', market: 'B-BTC_USDT' };

  // 1. Signature generation
  const signature = signCoinDcxPayload(mockSecret, payload);
  if (!signature || typeof signature !== 'string' || signature.length !== 64) {
    throw new Error(`Signer test failed: invalid signature hex length ${signature?.length}`);
  }

  // 2. Determinism test
  const signature2 = signCoinDcxPayload(mockSecret, payload);
  if (signature !== signature2) {
    throw new Error('Signer test failed: non-deterministic HMAC output');
  }

  // 3. Headers verification
  const headers = buildCoinDcxHeaders({ apiKey: mockApiKey, apiSecret: mockSecret }, payload);
  if (headers['X-AUTH-APIKEY'] !== mockApiKey) {
    throw new Error('Signer test failed: api key header mismatch');
  }
  if (headers['X-AUTH-SIGNATURE'] !== signature) {
    throw new Error('Signer test failed: signature header mismatch');
  }

  // 4. Key masking
  const masked = maskApiKey(mockApiKey);
  if (masked !== 'test...3456') {
    throw new Error(`Masking test failed: got ${masked}`);
  }

  return { status: 'passed', signatureLength: signature.length };
}

if (process.argv[1]?.includes('signer.test')) {
  try {
    const res = runSignerTests();
    console.log('HMAC Signer Unit Tests Passed:', res);
  } catch (err) {
    console.error('Signer Unit Tests Failed:', err);
    process.exit(1);
  }
}
