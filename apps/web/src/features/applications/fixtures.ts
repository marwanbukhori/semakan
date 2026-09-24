import type { ApplicationDetail, ApplicationSummary } from './types';

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

export function makeApplicationDetail(
  overrides: Partial<ApplicationDetail> = {},
): ApplicationDetail {
  return {
    ...makeApplicationSummary({ status: 'under_review' }),
    applicantIdNumber: '850412-10-5523',
    applicantEmail: 'tan.1@example.com.my',
    applicantPhone: '012-345 6789',
    businessAddress: '12, Jalan Merdeka, 40000 Selangor',
    documents: [
      {
        id: 'app-001-doc-1',
        kind: 'ssm_certificate',
        fileName: 'ssm_certificate.pdf',
        sizeKb: 320,
      },
      { id: 'app-001-doc-2', kind: 'premises_photo', fileName: 'premises_photo.jpg', sizeKb: 1480 },
    ],
    timeline: [
      {
        id: 'app-001-ev-1',
        kind: 'submitted',
        at: '2026-09-20T09:00:00.000Z',
        actor: 'Tan Wei Jie',
      },
      {
        id: 'app-001-ev-2',
        kind: 'status_changed',
        at: '2026-09-21T09:00:00.000Z',
        actor: 'Pn. Hafizah',
        from: 'submitted',
        to: 'under_review',
        note: null,
      },
    ],
    version: 2,
    ...overrides,
  };
}
