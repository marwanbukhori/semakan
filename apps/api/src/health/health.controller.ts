import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ProblemException } from '../http/problem.filter';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('live')
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready() {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ProblemException(503, {
        title: 'Service Unavailable',
        detail: 'The database is not reachable.',
      });
    }
    return { status: 'ok' };
  }
}
