import type { ApplicationDetail, TimelineEvent } from '@semakan/contract';
import { ApplicationEntity } from './entities/application.entity';
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

/** Maps a contract application detail (without documents/timeline) to its row. */
export function toApplicationRow(a: ApplicationDetail): ApplicationEntity {
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
