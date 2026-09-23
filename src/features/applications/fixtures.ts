import type { ApplicationSummary } from './types';

export function makeApplicationSummary(
  overrides: Partial<ApplicationSummary> = {},
): ApplicationSummary {
  return {
    id: 'app-001',
    referenceNo: 'LPP-2026-1000',
    applicantName: 'Tan Wei Jie',
    businessName: 'Kedai Runcit Maju',
    premisesCategory: 'retail',
    state: 'Selangor',
    submittedAt: '2026-09-20T09:00:00.000Z',
    status: 'approved',
    assignedOfficerName: 'Pn. Hafizah',
    ...overrides,
  };
}
