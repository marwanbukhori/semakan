import type { DataSource, EntityManager } from 'typeorm';
import type { ApplicationDetail } from '@semakan/contract';
import { seedApplicationDetails } from '@semakan/seed';
import { ApplicationEntity } from './entities/application.entity';
import { DocumentEntity } from './entities/document.entity';
import { TimelineEventEntity } from './entities/timeline-event.entity';
import { toApplicationRow, toTimelineRow } from './mappers';

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
