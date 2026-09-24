import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import {
  ApplicationDetailSchema,
  ApplicationSummarySchema,
  PAGE_SIZE,
  TimelineEventSchema,
} from '@semakan/contract';
import type {
  ApplicationDetail,
  ApplicationList,
  ApplicationListParams,
  ApplicationSummary,
  SortField,
  TimelineEvent,
} from '@semakan/contract';
import { ApplicationEntity } from '../db/entities/application.entity';
import { DocumentEntity } from '../db/entities/document.entity';
import { TimelineEventEntity } from '../db/entities/timeline-event.entity';
import { toTimelineRow } from '../db/mappers';

/*
 * Sorting must match queryApplications in @semakan/seed, which compares with JS
 * localeCompare (ICU root collation), not byte order. The database's default
 * collation (en_US.utf8 on musl in postgres:17-alpine) sorts like "C", where
 * "Z" < "a". The ICU root collation "und-x-icu" ships with postgres:17-alpine
 * and orders text the way localeCompare does, so every text sort uses it.
 * submitted_at is a timestamptz; the mock compares same-format ISO strings,
 * which orders identically.
 */
const COLLATION = '"und-x-icu"';
const SORT_COLUMNS: Record<SortField, string> = {
  submittedAt: 'submitted_at',
  referenceNo: `reference_no COLLATE ${COLLATION}`,
  businessName: `business_name COLLATE ${COLLATION}`,
};

interface SummaryRow {
  id: string;
  reference_no: string;
  applicant_name: string;
  business_name: string;
  premises_category: string;
  state: string;
  submitted_at: Date;
  status: string;
  assigned_officer_name: string | null;
}

/** Escapes LIKE wildcards so a search matches them literally (used with ESCAPE '\'). */
function escapeLike(q: string): string {
  return q.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function toSummary(row: SummaryRow): ApplicationSummary {
  return ApplicationSummarySchema.parse({
    id: row.id,
    referenceNo: row.reference_no,
    applicantName: row.applicant_name,
    businessName: row.business_name,
    premisesCategory: row.premises_category,
    state: row.state,
    submittedAt: row.submitted_at.toISOString(),
    status: row.status,
    assignedOfficerName: row.assigned_officer_name,
  });
}

function toTimelineEvent(row: TimelineEventEntity): TimelineEvent {
  return TimelineEventSchema.parse({
    ...row.data,
    id: row.id,
    kind: row.kind,
    at: row.at.toISOString(),
    actor: row.actor,
  });
}

@Injectable()
export class ApplicationsRepository {
  constructor(private readonly ds: DataSource) {}

  /** Loads one application; pass `manager` to read on a transaction's connection. */
  async findDetail(
    id: string,
    manager: EntityManager = this.ds.manager,
  ): Promise<ApplicationDetail | null> {
    const row = await manager.findOneBy(ApplicationEntity, { id });
    if (!row) return null;
    const [documents, timeline] = await Promise.all([
      manager.find(DocumentEntity, { where: { applicationId: id }, order: { position: 'ASC' } }),
      manager.find(TimelineEventEntity, { where: { applicationId: id }, order: { seq: 'ASC' } }),
    ]);
    return ApplicationDetailSchema.parse({
      id: row.id,
      referenceNo: row.referenceNo,
      applicantName: row.applicantName,
      businessName: row.businessName,
      premisesCategory: row.premisesCategory,
      state: row.state,
      submittedAt: row.submittedAt.toISOString(),
      status: row.status,
      assignedOfficerName: row.assignedOfficerName,
      applicantIdNumber: row.applicantIdNumber,
      applicantEmail: row.applicantEmail,
      applicantPhone: row.applicantPhone,
      businessAddress: row.businessAddress,
      documents: documents.map((d) => ({
        id: d.id,
        kind: d.kind,
        fileName: d.fileName,
        sizeKb: d.sizeKb,
      })),
      timeline: timeline.map(toTimelineEvent),
      version: row.version,
    });
  }

  /** Filter, sort and paginate with the same semantics as queryApplications in @semakan/seed. */
  async list(params: ApplicationListParams, pageSize = PAGE_SIZE): Promise<ApplicationList> {
    const where: string[] = [];
    const args: unknown[] = [];
    if (params.status !== 'all') {
      args.push(params.status);
      where.push(`status = $${args.length}`);
    }
    if (params.q !== '') {
      args.push(`%${escapeLike(params.q)}%`);
      const p = `$${args.length}`;
      where.push(
        `(reference_no ILIKE ${p} ESCAPE '\\' OR applicant_name ILIKE ${p} ESCAPE '\\' OR business_name ILIKE ${p} ESCAPE '\\')`,
      );
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const [{ total }] = await this.ds.query<[{ total: number }]>(
      `SELECT count(*)::int AS total FROM applications ${whereSql}`,
      args,
    );

    const lastPage = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(params.page, lastPage);
    const dir = params.order === 'asc' ? 'ASC' : 'DESC';
    // The tie-breaker takes the same direction as the sort, like the reference.
    const orderSql =
      params.sort === 'referenceNo'
        ? `${SORT_COLUMNS.referenceNo} ${dir}`
        : `${SORT_COLUMNS[params.sort]} ${dir}, ${SORT_COLUMNS.referenceNo} ${dir}`;
    const rows = await this.ds.query<SummaryRow[]>(
      `SELECT id, reference_no, applicant_name, business_name, premises_category, state,
              submitted_at, status, assigned_officer_name
         FROM applications ${whereSql}
        ORDER BY ${orderSql}
        LIMIT $${args.length + 1} OFFSET $${args.length + 2}`,
      [...args, pageSize, (page - 1) * pageSize],
    );

    return { items: rows.map(toSummary), page, pageSize, total };
  }

  /**
   * Optimistic save: bumps the version only if it still equals `before.version`,
   * then appends the event. Run it inside a transaction (`manager`).
   */
  async saveReview(
    manager: EntityManager,
    before: ApplicationDetail,
    after: ApplicationDetail,
    event: TimelineEvent,
  ): Promise<'ok' | 'conflict'> {
    const result = await manager
      .createQueryBuilder()
      .update(ApplicationEntity)
      .set({
        status: after.status,
        assignedOfficerName: after.assignedOfficerName,
        version: () => 'version + 1',
      })
      .where('id = :id AND version = :version', { id: before.id, version: before.version })
      .execute();
    if (!result.affected) return 'conflict';
    await manager.insert(
      TimelineEventEntity,
      toTimelineRow(before.id, after.timeline.length, event),
    );
    return 'ok';
  }
}
