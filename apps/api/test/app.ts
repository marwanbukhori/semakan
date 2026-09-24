import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure';

/** Boots the real AppModule with the same pipeline as main.ts. Set DATABASE_URL first. */
export async function createTestApp() {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = configureApp(moduleRef.createNestApplication());
  await app.init();
  return app;
}
