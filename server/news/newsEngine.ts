import { NewsEvent } from '../types/quant.ts';

export class NewsEngine {
  private events: Map<string, NewsEvent> = new Map();
  private seenHeadlines: Set<string> = new Set();

  constructor() {
    this.initSeedNews();
  }

  private initSeedNews(): void {
    const seedEvents: NewsEvent[] = [
      {
        id: 'news-1',
        timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        source: 'CoinDesk / CoinDCX Alerts',
        symbol: 'B-BTC_USDT',
        eventType: 'macroeconomic',
        headline: 'US Core PCE Inflation Matches 2.6% Expectations; Rate Cut Odds Firm',
        summary: 'Macro data supports dovish Fed trajectory; crypto perpetual markets see immediate open interest spike.',
        sentiment: 0.65,
        severity: 0.72,
        confidence: 0.94,
        novelty: 0.88,
        materialityScore: 0.78,
      },
      {
        id: 'news-2',
        timestamp: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
        source: 'SEC Filings / Bloomberg',
        symbol: 'NVDA',
        eventType: 'earnings_guidance',
        headline: 'NVIDIA Raises Q3 Data Center Revenue Guidance by 18% in Regulatory 8-K',
        summary: 'Massive demand for next-gen AI accelerators drives pre-market volume higher by 3.2x normal levels.',
        sentiment: 0.88,
        severity: 0.85,
        confidence: 0.98,
        novelty: 0.95,
        materialityScore: 0.92,
      },
      {
        id: 'news-3',
        timestamp: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
        source: 'Exchange Infrastructure Monitor',
        symbol: 'B-ETH_USDT',
        eventType: 'exchange_event',
        headline: 'CoinDCX Futures Platform Completes Scheduled Matching Engine Optimization',
        summary: 'API latency reduced by 14ms across perpetual order routing channels; all pairs fully synchronized.',
        sentiment: 0.30,
        severity: 0.40,
        confidence: 0.99,
        novelty: 0.50,
        materialityScore: 0.45,
      },
      {
        id: 'news-4',
        timestamp: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
        source: 'Federal Reserve Wire',
        symbol: 'QQQ',
        eventType: 'Federal Reserve',
        headline: 'FOMC Member Speech Emphasizes Disciplined Data-Dependent Easing Cycle',
        summary: 'Bond yields edge lower as equity index futures consolidate inside opening 15-minute range.',
        sentiment: 0.20,
        severity: 0.60,
        confidence: 0.91,
        novelty: 0.62,
        materialityScore: 0.65,
      },
    ];

    for (const item of seedEvents) {
      this.addEvent(item);
    }
  }

  public addEvent(event: NewsEvent): boolean {
    const normalizedHeadline = event.headline.toLowerCase().trim();
    if (this.seenHeadlines.has(normalizedHeadline)) {
      return false; // Deduplicated
    }
    this.seenHeadlines.add(normalizedHeadline);
    this.events.set(event.id, event);
    return true;
  }

  public getRecentEvents(limit: number = 20, symbol?: string): NewsEvent[] {
    let list = Array.from(this.events.values());
    if (symbol) {
      list = list.filter(e => !e.symbol || e.symbol === symbol);
    }
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
  }
}
