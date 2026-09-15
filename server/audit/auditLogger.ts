import { AuditEvent } from '../types/quant.ts';

export class AuditLogger {
  private logs: AuditEvent[] = [];
  private maxLogs: number = 2000;

  constructor() {
    this.record({
      actor: 'SYSTEM',
      action: 'BOOTSTRAP',
      entity: 'APPLICATION',
      entityId: 'alpha-quant-platform',
      result: 'SUCCESS',
      metadata: {
        mode: 'RESEARCH',
        liveTradingEnabled: process.env.LIVE_TRADING_ENABLED === 'true',
        version: '1.0.0-prod',
      },
    });
  }

  public record(entry: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
    // Sanitize metadata to never store secrets or API keys
    const sanitizedMetadata = this.sanitize(entry.metadata);

    const event: AuditEvent = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      actor: entry.actor || 'ANONYMOUS',
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      requestId: entry.requestId,
      correlationId: entry.correlationId || `corr-${Date.now()}`,
      result: entry.result,
      metadata: sanitizedMetadata,
    };

    this.logs.push(event);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    return event;
  }

  public getEvents(limit: number = 50, entity?: string): AuditEvent[] {
    let list = [...this.logs];
    if (entity) {
      list = list.filter(e => e.entity === entity);
    }
    return list.reverse().slice(0, limit);
  }

  private sanitize(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    const clean: any = Array.isArray(obj) ? [] : {};
    for (const key of Object.keys(obj)) {
      const lower = key.toLowerCase();
      if (lower.includes('secret') || lower.includes('key') || lower.includes('password') || lower.includes('token')) {
        clean[key] = '***REDACTED***';
      } else if (typeof obj[key] === 'object') {
        clean[key] = this.sanitize(obj[key]);
      } else {
        clean[key] = obj[key];
      }
    }
    return clean;
  }
}
