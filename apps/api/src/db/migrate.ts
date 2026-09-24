import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { loadConfig } from '../config';
import { dataSourceOptions } from './data-source';

const ds = await new DataSource(
  dataSourceOptions(loadConfig(process.env).DATABASE_URL),
).initialize();
try {
  const applied = await ds.runMigrations();
  console.log(`Applied ${applied.length} migration(s).`);
} finally {
  await ds.destroy();
}
