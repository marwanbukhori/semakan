import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'idempotency_keys' })
export class IdempotencyKeyEntity {
  @PrimaryColumn('text') key!: string;
  @Column('text', { name: 'request_hash' }) requestHash!: string;
  @Column('int', { name: 'response_status' }) responseStatus!: number;
  @Column('jsonb', { name: 'response_body' }) responseBody!: unknown;
  @Column('timestamptz', { name: 'created_at', default: () => 'now()' }) createdAt!: Date;
}
