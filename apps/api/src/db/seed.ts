import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { loadConfig } from '../config';
import { dataSourceOptions } from './data-source';
import { ApplicationEntity } from './entities/application.entity';
import { insertSeed } from './seed-data';

// Idempotent: runs the migrations, then seeds only an empty table.
const ds = await new DataSource(
  dataSourceOptions(loadConfig(process.env).DATABASE_URL),
).initialize();
try {
  await ds.runMigrations();
  if ((await ds.getRepository(ApplicationEntity).count()) === 0) {
    await insertSeed(ds);
    console.log('Seeded the demo applications.');
  } else {
    console.log('Applications already present; seed skipped.');
  }
} finally {
  await ds.destroy();
}
