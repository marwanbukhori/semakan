import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { IdempotencyKeyEntity } from '../db/entities/idempotency-key.entity';

export interface StoredResponse {
  requestHash: string;
  status: number;
  body: unknown;
}

/** JSON with object keys sorted recursively, so equal bodies serialise identically. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

/** The fingerprint stored with an idempotency key: the target id plus the body. */
export function requestHash(id: string, body: unknown): string {
  return createHash('sha256')
    .update(`${id}:${canonicalJson(body)}`)
    .digest('hex');
}

/** Stores successful responses by Idempotency-Key. Always used inside a transaction. */
@Injectable()
export class IdempotencyRepository {
  async find(manager: EntityManager, key: string): Promise<StoredResponse | null> {
    const row = await manager.findOneBy(IdempotencyKeyEntity, { key });
    if (!row) return null;
    return { requestHash: row.requestHash, status: row.responseStatus, body: row.responseBody };
  }

  async save(manager: EntityManager, key: string, response: StoredResponse): Promise<void> {
    await manager.query(
      `INSERT INTO idempotency_keys (key, request_hash, response_status, response_body)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (key) DO NOTHING`,
      [key, response.requestHash, response.status, JSON.stringify(response.body)],
    );
  }
}
