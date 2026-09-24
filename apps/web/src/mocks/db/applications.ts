import { decide } from '@semakan/domain';
import {
  CURRENT_OFFICER,
  queryApplications,
  requiresFireCertificate,
  seedApplicationDetails,
  seedApplications,
  toSummary,
} from '@semakan/seed';
import type {
  ApplicationDetail,
  ApplicationSummary,
  ReviewRequest,
} from '@/features/applications/types';
import type { ReviewErrorCode } from '@/features/applications/rules';

export {
  CURRENT_OFFICER,
  queryApplications,
  requiresFireCertificate,
  seedApplicationDetails,
  seedApplications,
  toSummary,
};

let applications = seedApplicationDetails();

export function getApplications(): readonly ApplicationSummary[] {
  return applications.map(toSummary);
}

export function getApplication(id: string): ApplicationDetail | undefined {
  return applications.find((application) => application.id === id);
}

export function resetApplications(): void {
  applications = seedApplicationDetails();
}

export type ReviewOutcome =
  | { kind: 'ok'; detail: ApplicationDetail }
  | { kind: 'not_found' }
  | { kind: 'conflict' }
  | { kind: 'invalid'; fieldErrors: Record<string, ReviewErrorCode[]> };

/** The mock server's rules. The UI does not know the fire-certificate rule; it learns it from the 422. */
export function applyReview(id: string, request: ReviewRequest, now = new Date()): ReviewOutcome {
  const current = getApplication(id);
  if (!current) return { kind: 'not_found' };

  const result = decide(current, request, CURRENT_OFFICER, now);
  if (!result.ok) {
    if (result.error.kind === 'version_conflict') return { kind: 'conflict' };
    return { kind: 'invalid', fieldErrors: { [result.error.field]: [result.error.code] } };
  }

  const { detail } = result.value;
  applications = applications.map((application) => (application.id === id ? detail : application));
  return { kind: 'ok', detail };
}
