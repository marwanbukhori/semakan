import { PAGE_SIZE, PREMISES_CATEGORIES } from '@/features/applications/schemas';
import type {
  ApplicationList,
  ApplicationListParams,
  ApplicationStatus,
  ApplicationSummary,
  PremisesCategory,
  SortField,
} from '@/features/applications/types';
import { createRandom } from './random';

const SEED = 20260923;
const COUNT = 57;
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

let applications = seedApplications();

export function getApplications(): readonly ApplicationSummary[] {
  return applications;
}

export function resetApplications(): void {
  applications = seedApplications();
}

const SORTERS: Record<SortField, (a: ApplicationSummary, b: ApplicationSummary) => number> = {
  submittedAt: (a, b) => a.submittedAt.localeCompare(b.submittedAt),
  referenceNo: (a, b) => a.referenceNo.localeCompare(b.referenceNo),
  businessName: (a, b) => a.businessName.localeCompare(b.businessName),
};

/** Server-side filter, sort and paginate, the way a real list endpoint would. */
export function queryApplications(
  all: readonly ApplicationSummary[],
  params: ApplicationListParams,
  pageSize = PAGE_SIZE,
): ApplicationList {
  const q = params.q.toLowerCase();
  const matches = all.filter(
    (item) =>
      (params.status === 'all' || item.status === params.status) &&
      (q === '' ||
        [item.referenceNo, item.applicantName, item.businessName].some((field) =>
          field.toLowerCase().includes(q),
        )),
  );

  const direction = params.order === 'asc' ? 1 : -1;
  const sorted = [...matches].sort(
    (a, b) =>
      (SORTERS[params.sort](a, b) || a.referenceNo.localeCompare(b.referenceNo)) * direction,
  );

  const lastPage = Math.max(1, Math.ceil(sorted.length / pageSize));
  const page = Math.min(params.page, lastPage);
  return {
    items: sorted.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageSize,
    total: sorted.length,
  };
}
