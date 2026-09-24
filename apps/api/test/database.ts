import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../src/db/data-source';
import { insertSeed } from '../src/db/seed-data';

/** Opens a DataSource on the Testcontainers database and brings the schema up to date. */
export async function openTestDataSource(url: string): Promise<DataSource> {
  const ds = await new DataSource(dataSourceOptions(url)).initialize();
  await ds.runMigrations();
  return ds;
}

/**
 * Test files share one database (fileParallelism: false), so each one resets it:
 * empty every table, then insert the seed again.
 */
export async function resetDatabase(ds: DataSource): Promise<void> {
  await ds.query('TRUNCATE applications, idempotency_keys CASCADE');
  await insertSeed(ds);
}
