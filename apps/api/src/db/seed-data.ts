import type { DataSource, EntityManager } from 'typeorm';
import type { ApplicationDetail, TimelineEvent } from '@semakan/contract';
import { seedApplicationDetails } from '@semakan/seed';
import { ApplicationEntity } from './entities/application.entity';
import { DocumentEntity } from './entities/document.entity';
import { TimelineEventEntity } from './entities/timeline-event.entity';

/** Maps a contract event to its row; `seq` is 1-based, so the nth event has seq n. */
export function toTimelineRow(
  applicationId: string,
  seq: number,
  event: TimelineEvent,
): TimelineEventEntity {
  const { id, kind, at, actor, ...data } = event;
  return { id, applicationId, seq, kind, at: new Date(at), actor, data };
}

function toApplicationRow(a: ApplicationDetail): ApplicationEntity {
  return {
    id: a.id,
    referenceNo: a.referenceNo,
    applicantName: a.applicantName,
    applicantIdNumber: a.applicantIdNumber,
    applicantEmail: a.applicantEmail,
    applicantPhone: a.applicantPhone,
    businessName: a.businessName,
    businessAddress: a.businessAddress,
    premisesCategory: a.premisesCategory,
    state: a.state,
    submittedAt: new Date(a.submittedAt),
    status: a.status,
    assignedOfficerName: a.assignedOfficerName,
    version: a.version,
  };
}

async function insertDetails(m: EntityManager, details: ApplicationDetail[]): Promise<void> {
  await m.insert(ApplicationEntity, details.map(toApplicationRow));
  await m.insert(
    DocumentEntity,
    details.flatMap((a) =>
      a.documents.map((d, index) => ({
        id: d.id,
        applicationId: a.id,
        position: index + 1,
        kind: d.kind,
        fileName: d.fileName,
        sizeKb: d.sizeKb,
      })),
    ),
  );
  await m.insert(
    TimelineEventEntity,
    details.flatMap((a) => a.timeline.map((e, index) => toTimelineRow(a.id, index + 1, e))),
  );
}

/** Inserts the deterministic demo data from @semakan/seed in one transaction. */
export async function insertSeed(ds: DataSource): Promise<void> {
  await ds.transaction((m) => insertDetails(m, seedApplicationDetails()));
}
