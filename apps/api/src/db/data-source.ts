import type { DataSourceOptions } from 'typeorm';
import { ApplicationEntity } from './entities/application.entity';
import { DocumentEntity } from './entities/document.entity';
import { IdempotencyKeyEntity } from './entities/idempotency-key.entity';
import { TimelineEventEntity } from './entities/timeline-event.entity';
import { Init1727200000000 } from './migrations/1727200000000-Init';

export const ENTITIES = [
  ApplicationEntity,
  DocumentEntity,
  TimelineEventEntity,
  IdempotencyKeyEntity,
];
export const MIGRATIONS = [Init1727200000000];

/** One source of connection settings for AppModule, the migrate CLI and the seed. */
export function dataSourceOptions(url: string) {
  return {
    type: 'postgres',
    url,
    entities: ENTITIES,
    migrations: MIGRATIONS,
    migrationsRun: false,
    synchronize: false,
    // Passed to the pg pool: fail fast when the database is unreachable, and
    // cap any single statement (including a wait on the idempotency lock).
    extra: { connectionTimeoutMillis: 2000, statement_timeout: 5000 },
  } satisfies DataSourceOptions;
}
