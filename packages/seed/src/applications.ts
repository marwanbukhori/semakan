import { requiresFireCertificate } from '@semakan/domain';
import { PREMISES_CATEGORIES } from '@semakan/contract';
import type {
  ApplicationDetail,
  ApplicationDocument,
  ApplicationStatus,
  ApplicationSummary,
  DocumentKind,
  PremisesCategory,
  TimelineEvent,
} from '@semakan/contract';
import { createRandom } from './random';

export { requiresFireCertificate };

/** Compile-time exhaustiveness check: calling this with a non-`never` value is a type error. */
function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${JSON.stringify(value)}`);
}

export const SEED = 20260923;
export const COUNT = 57;
const HOUR_MS = 60 * 60 * 1000;
const LATEST_SUBMISSION = Date.UTC(2026, 8, 20, 9, 0, 0);

const APPLICANTS = [
  'Nur Aisyah binti Ismail',
  'Muhammad Farid bin Hassan',
  'Tan Wei Jie',
  'Lim Mei Ling',
  'Rajesh a/l Subramaniam',
  'Kavitha a/p Krishnan',
  'Siti Hajar binti Rahman',
  'Wong Chee Keong',
  'Ahmad Zaki bin Abdullah',
  'Nurul Izzah binti Kamal',
  'Chong Kah Yan',
  'Arun a/l Muthu',
] as const;

const BUSINESSES: Record<PremisesCategory, readonly string[]> = {
  food_beverage: [
    'Restoran Selera Kampung',
    'Kafe Kopi Tiam 88',
    'Nasi Kandar Pelita Jaya',
    'Warung Mak Teh',
  ],
  retail: ['Kedai Runcit Maju', 'Butik Tudung Anggun', 'Kedai Buku Ilmu', 'Farmasi Sihat Selalu'],
  services: [
    'Dobi Layan Diri Bersih',
    'Salun Rambut Gaya',
    'Pusat Tuisyen Cemerlang',
    'Klinik Gigi Senyum',
  ],
  workshop: [
    'Bengkel Kereta Hafiz',
    'Bengkel Motor Laju',
    'Kedai Tayar Jaya',
    'Bengkel Aircond Sejuk',
  ],
  entertainment: [
    'Pusat Karaoke Suara Emas',
    'Pusat Futsal Arena',
    'Pusat Snuker Cue',
    'Taman Tema Mini Ceria',
  ],
};

const STATES = [
  'Selangor',
  'Kuala Lumpur',
  'Johor',
  'Pulau Pinang',
  'Perak',
  'Sabah',
  'Sarawak',
  'Kedah',
  'Melaka',
  'Pahang',
] as const;

const OFFICERS = ['Pn. Hafizah', 'En. Kumar', 'Cik Liyana'] as const;

const STATUS_WEIGHTS: ReadonlyArray<readonly [ApplicationStatus, number]> = [
  ['submitted', 30],
  ['under_review', 25],
  ['info_requested', 15],
  ['approved', 20],
  ['rejected', 10],
];

function weightedStatus(roll: number): ApplicationStatus {
  const total = STATUS_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0);
  let threshold = roll * total;
  for (const [status, weight] of STATUS_WEIGHTS) {
    if (threshold < weight) return status;
    threshold -= weight;
  }
  // Unreachable while the weights sum to the total; kept as a safe default.
  /* v8 ignore next */
  return 'submitted';
}

export function seedApplications(count = COUNT, seed = SEED): ApplicationSummary[] {
  const random = createRandom(seed);
  return Array.from({ length: count }, (_, index) => {
    const premisesCategory = random.pick(PREMISES_CATEGORIES);
    const status = weightedStatus(random.next());
    return {
      id: `app-${String(index + 1).padStart(3, '0')}`,
      referenceNo: `LPP-2026-${1000 + index}`,
      applicantName: random.pick(APPLICANTS),
      businessName: random.pick(BUSINESSES[premisesCategory]),
      premisesCategory,
      state: random.pick(STATES),
      submittedAt: new Date(LATEST_SUBMISSION - random.int(0, 60 * 24) * HOUR_MS).toISOString(),
      status,
      assignedOfficerName: status === 'submitted' ? null : random.pick(OFFICERS),
    };
  });
}

export const CURRENT_OFFICER = 'Pn. Hafizah';
const DAY_MS = 24 * HOUR_MS;
// Detail fields use their own random stream per record, so the summaries (and the
// Plan 1 tests built on them) stay exactly as they were.
const DETAIL_SEED_OFFSET = 1000;

const STREETS = [
  'Merdeka',
  'Bunga Raya',
  'Tun Razak',
  'Sultan Ismail',
  'Perdana',
  'Kenanga',
] as const;

const pad = (n: number) => String(n).padStart(2, '0');

function seedDocuments(
  summary: ApplicationSummary,
  random: ReturnType<typeof createRandom>,
): ApplicationDocument[] {
  const kinds: DocumentKind[] = ['ssm_certificate', 'premises_photo'];
  if (random.next() < 0.7) kinds.push('floor_plan');
  const mustHaveFire =
    summary.status === 'approved' && requiresFireCertificate(summary.premisesCategory);
  if (mustHaveFire || random.next() < 0.6) kinds.push('fire_certificate');
  return kinds.map((kind, index) => ({
    id: `${summary.id}-doc-${index + 1}`,
    kind,
    fileName: kind === 'premises_photo' ? `${kind}.jpg` : `${kind}.pdf`,
    sizeKb: random.int(80, 2400),
  }));
}

function seedTimeline(
  summary: ApplicationSummary,
  documents: ApplicationDocument[],
): TimelineEvent[] {
  const at = (days: number) =>
    new Date(Date.parse(summary.submittedAt) + days * DAY_MS).toISOString();
  const event = (n: number) => `${summary.id}-ev-${n}`;
  const officer = summary.assignedOfficerName ?? CURRENT_OFFICER;
  const events: TimelineEvent[] = [
    { id: event(1), kind: 'submitted', at: summary.submittedAt, actor: summary.applicantName },
  ];
  if (summary.status === 'submitted') return events;

  events.push({
    id: event(2),
    kind: 'status_changed',
    at: at(1),
    actor: officer,
    from: 'submitted',
    to: 'under_review',
    note: null,
  });

  switch (summary.status) {
    case 'under_review':
      break;
    case 'info_requested': {
      const missing = (['floor_plan', 'fire_certificate'] as const).filter(
        (kind) => !documents.some((doc) => doc.kind === kind),
      );
      events.push({
        id: event(3),
        kind: 'info_requested',
        at: at(2),
        actor: officer,
        requestedInfo: missing.length > 0 ? [...missing] : ['floor_plan'],
        note: 'Sila kemukakan dokumen tambahan.',
      });
      break;
    }
    case 'approved':
      events.push({
        id: event(3),
        kind: 'status_changed',
        at: at(3),
        actor: officer,
        from: 'under_review',
        to: 'approved',
        note: 'Semua dokumen lengkap.',
      });
      break;
    case 'rejected':
      events.push({
        id: event(3),
        kind: 'status_changed',
        at: at(3),
        actor: officer,
        from: 'under_review',
        to: 'rejected',
        note: 'Premis tidak mematuhi syarat zon.',
      });
      break;
    /* v8 ignore next 2 */
    default:
      return assertNever(summary.status);
  }
  return events;
}

export function seedApplicationDetails(count = COUNT, seed = SEED): ApplicationDetail[] {
  return seedApplications(count, seed).map((summary, index) => {
    const random = createRandom(seed + DETAIL_SEED_OFFSET + index);
    const firstName =
      summary.applicantName
        .split(' ')[0]
        ?.toLowerCase()
        .replace(/[^a-z]/g, '') ?? 'pemohon';
    const documents = seedDocuments(summary, random);
    const timeline = seedTimeline(summary, documents);
    return {
      ...summary,
      applicantIdNumber: `${pad(random.int(60, 99))}${pad(random.int(1, 12))}${pad(random.int(1, 28))}-${pad(random.int(1, 14))}-${random.int(1000, 9999)}`,
      applicantEmail: `${firstName}.${index + 1}@example.com.my`,
      applicantPhone: `01${random.int(0, 9)}-${random.int(100, 999)} ${random.int(1000, 9999)}`,
      businessAddress: `${random.int(1, 120)}, Jalan ${random.pick(STREETS)}, ${random.int(10000, 98000)} ${summary.state}`,
      documents,
      timeline,
      version: timeline.length,
    };
  });
}

export function toSummary(detail: ApplicationDetail): ApplicationSummary {
  const {
    id,
    referenceNo,
    applicantName,
    businessName,
    premisesCategory,
    state,
    submittedAt,
    status,
    assignedOfficerName,
  } = detail;
  return {
    id,
    referenceNo,
    applicantName,
    businessName,
    premisesCategory,
    state,
    submittedAt,
    status,
    assignedOfficerName,
  };
}
