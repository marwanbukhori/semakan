import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';

let pg: StartedPostgreSqlContainer;

export async function setup(project: TestProject) {
  const t0 = performance.now();
  pg = await new PostgreSqlContainer('postgres:17-alpine').start();
  console.log(`[global-setup] postgres started in ${Math.round(performance.now() - t0)}ms`);
  project.provide('databaseUrl', pg.getConnectionUri());
}

export async function teardown() {
  await pg?.stop();
}

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}
