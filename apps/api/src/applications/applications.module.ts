import { Module } from '@nestjs/common';
import { ApplicationsController } from './applications.controller';
import { ApplicationsRepository } from './applications.repository';
import { ApplicationsService } from './applications.service';
import { IdempotencyRepository } from './idempotency.repository';

@Module({
  controllers: [ApplicationsController],
  providers: [ApplicationsRepository, ApplicationsService, IdempotencyRepository],
})
export class ApplicationsModule {}
