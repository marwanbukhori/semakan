import { Injectable } from '@nestjs/common';
import type { ApplicationDetail, ApplicationList, ApplicationListParams } from '@semakan/contract';
import { ApplicationsRepository } from './applications.repository';
import { ProblemException } from '../http/problem.filter';

/** A thin application service: it delegates to the repository and turns "missing" into 404. */
@Injectable()
export class ApplicationsService {
  constructor(private readonly repo: ApplicationsRepository) {}

  list(params: ApplicationListParams): Promise<ApplicationList> {
    return this.repo.list(params);
  }

  async getDetail(id: string): Promise<ApplicationDetail> {
    const detail = await this.repo.findDetail(id);
    if (!detail) {
      throw new ProblemException(404, { title: 'Application not found', code: 'not_found' });
    }
    return detail;
  }
}
