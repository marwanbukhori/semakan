import { Module } from '@nestjs/common';
import { ApplicationsController } from './applications.controller';
import { ApplicationsRepository } from './applications.repository';
import { loadConfig } from '../config';
import { ApplicationsService, DEMO_OFFICER } from './applications.service';
import { IdempotencyRepository } from './idempotency.repository';

@Module({
  controllers: [ApplicationsController],
  providers: [
    ApplicationsRepository,
    ApplicationsService,
    IdempotencyRepository,
    { provide: DEMO_OFFICER, useFactory: () => loadConfig(process.env).DEMO_OFFICER },
  ],
})
export class ApplicationsModule {}
