import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { loadConfig } from './config';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        url: loadConfig(process.env).DATABASE_URL,
        entities: [],
        migrations: [],
        migrationsRun: true,
        synchronize: false,
        retryAttempts: 2,
        retryDelay: 1000,
      }),
    }),
    HealthModule,
  ],
})
export class AppModule {}
