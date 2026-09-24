import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { loadConfig } from './config';
import { dataSourceOptions } from './db/data-source';
import { ApplicationsModule } from './applications/applications.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...dataSourceOptions(loadConfig(process.env).DATABASE_URL),
        migrationsRun: true,
        retryAttempts: 2,
        retryDelay: 1000,
      }),
    }),
    ApplicationsModule,
    HealthModule,
  ],
})
export class AppModule {}
