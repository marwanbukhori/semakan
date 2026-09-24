import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type {
  ApplicationDetail,
  ApplicationList,
  ApplicationListParams,
  ReviewRequest,
} from '@semakan/contract';
import { decide } from '@semakan/domain';
import { CURRENT_OFFICER } from '@semakan/seed';
import { ApplicationsRepository } from './applications.repository';
import { IdempotencyRepository, requestHash } from './idempotency.repository';
import { ProblemException } from '../http/problem.filter';

export interface ReviewResponse {
  status: number;
  body: ApplicationDetail;
}

const notFound = () =>
  new ProblemException(404, { title: 'Application not found', code: 'not_found' });

const versionConflict = () =>
  new ProblemException(409, { title: 'Updated by another officer', code: 'version_conflict' });

/** The application service: list, detail and review, turning outcomes into HTTP problems. */
@Injectable()
export class ApplicationsService {
  constructor(
    private readonly ds: DataSource,
    private readonly repo: ApplicationsRepository,
    private readonly idempotency: IdempotencyRepository,
  ) {}

  list(params: ApplicationListParams): Promise<ApplicationList> {
    return this.repo.list(params);
  }

  async getDetail(id: string): Promise<ApplicationDetail> {
    const detail = await this.repo.findDetail(id);
    if (!detail) throw notFound();
    return detail;
  }

  /**
   * Records a review in one transaction: the idempotency lookup, the domain
   * decision, the optimistic save and the stored response commit together.
   * Any thrown problem rolls the transaction back, so failures are never stored.
   */
  review(id: string, request: ReviewRequest, idempotencyKey?: string): Promise<ReviewResponse> {
    const idempotency =
      idempotencyKey === undefined
        ? undefined
        : { key: idempotencyKey, hash: requestHash(id, request) };

    return this.ds.transaction(async (manager) => {
      if (idempotency) {
        const stored = await this.idempotency.find(manager, idempotency.key);
        if (stored && stored.requestHash !== idempotency.hash) {
          throw new ProblemException(409, {
            title: 'Idempotency key reused',
            code: 'idempotency_key_reused',
          });
        }
        if (stored) return { status: stored.status, body: stored.body as ApplicationDetail };
      }

      const before = await this.repo.findDetail(id, manager);
      if (!before) throw notFound();

      const decision = decide(before, request, CURRENT_OFFICER, new Date());
      if (!decision.ok) {
        if (decision.error.kind === 'version_conflict') throw versionConflict();
        throw new ProblemException(422, {
          title: 'Review rejected',
          fieldErrors: { [decision.error.field]: [decision.error.code] },
        });
      }

      const { detail, event } = decision.value;
      if ((await this.repo.saveReview(manager, before, detail, event)) === 'conflict') {
        throw versionConflict();
      }

      const response: ReviewResponse = { status: 200, body: detail };
      if (idempotency) {
        await this.idempotency.save(manager, idempotency.key, {
          requestHash: idempotency.hash,
          ...response,
        });
      }
      return response;
    });
  }
}
