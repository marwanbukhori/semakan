import type { Localized } from '../localized';

export type Role = 'frontend' | 'backend';
export type RequirementLevel = 'must' | 'nice';
/** `shown`: demonstrated live in Semakan. `partial`: some evidence exists. `planned`: not yet built. */
export type SemakanStatus = 'shown' | 'partial' | 'planned';

/** `path` is a location in the repo, not language-specific, so only the label is localised. */
export type RequirementLink = { label: Localized<string>; path: string };

/**
 * `as const` keeps every `id` a literal, so `RequirementId` below is derived from this list: an
 * invalid tag anywhere else in the content is a type error. The literal array isn't checked
 * against `Requirement` here — that would be circular, since `Requirement.id` is `RequirementId`,
 * which is derived from this same array — the shape is checked instead where `REQUIREMENTS` is
 * given its type, below.
 */
const REQUIREMENTS_DATA = [
  {
    id: 'fe-production',
    role: 'frontend',
    level: 'must',
    label: {
      en: 'Built and shipped production frontend applications',
      ms: 'Membina dan menghantar (ship) aplikasi frontend ke production',
    },
    semakan: {
      status: 'shown',
      links: [
        { label: { en: 'Vercel config', ms: 'Konfigurasi Vercel' }, path: 'vercel.json' },
        { label: { en: 'CI', ms: 'CI' }, path: '.github/workflows/ci.yml' },
      ],
    },
  },
  {
    id: 'fe-ts-react',
    role: 'frontend',
    level: 'must',
    label: {
      en: 'TypeScript and a component framework (React, Vue, Angular)',
      ms: 'TypeScript dan component framework (React, Vue, Angular)',
    },
    semakan: {
      status: 'shown',
      links: [
        {
          label: { en: 'The applications feature', ms: 'Feature applications' },
          path: 'apps/web/src/features/applications/routes/ListRoute.tsx',
        },
      ],
    },
  },
  {
    id: 'fe-architecture',
    role: 'frontend',
    level: 'must',
    label: {
      en: 'Component architecture, state management and data fetching',
      ms: 'Seni bina component, state management dan data fetching',
    },
    semakan: {
      status: 'shown',
      links: [
        {
          label: { en: 'Query hooks', ms: 'Query hooks' },
          path: 'apps/web/src/features/applications/api/queries.ts',
        },
        {
          label: { en: 'URL state', ms: 'URL state' },
          path: 'apps/web/src/features/applications/hooks/useApplicationFilters.ts',
        },
      ],
    },
  },
  {
    id: 'fe-api-states',
    role: 'frontend',
    level: 'must',
    label: {
      en: 'API integration with loading, error and edge-case handling',
      ms: 'Integrasi API dengan pengendalian loading, error dan edge-case',
    },
    semakan: {
      status: 'shown',
      links: [
        {
          label: { en: 'Review errors and conflicts', ms: 'Ralat review dan conflict' },
          path: 'apps/web/src/features/applications/routes/ReviewRoute.tsx',
        },
        {
          label: { en: 'Load errors', ms: 'Ralat pemuatan (load errors)' },
          path: 'apps/web/src/shared/ui/LoadError.tsx',
        },
      ],
    },
  },
  {
    id: 'fe-responsive',
    role: 'frontend',
    level: 'must',
    label: {
      en: 'HTML, CSS and responsive design',
      ms: 'HTML, CSS dan reka bentuk responsive',
    },
    semakan: {
      status: 'shown',
      links: [
        {
          label: { en: 'Stacked facts on mobile', ms: 'Fakta bertindan (stacked) pada mudah alih' },
          path: 'apps/web/src/features/applications/components/ApplicationFacts.tsx',
        },
      ],
    },
  },
  {
    id: 'fe-quality',
    role: 'frontend',
    level: 'must',
    label: {
      en: 'Code quality, testing and maintainable UI',
      ms: 'Kualiti kod, testing dan UI yang boleh diselenggara',
    },
    semakan: {
      status: 'shown',
      links: [
        { label: { en: 'AGENTS.md conventions', ms: 'Konvensyen AGENTS.md' }, path: 'AGENTS.md' },
        {
          label: { en: 'Mutation tests', ms: 'Mutation tests' },
          path: 'apps/web/src/features/applications/api/mutations.test.tsx',
        },
      ],
    },
  },
  {
    id: 'fe-collaboration',
    role: 'frontend',
    level: 'must',
    label: {
      en: 'Working closely with designers and backend engineers',
      ms: 'Bekerja rapat dengan designer dan jurutera backend',
    },
    semakan: {
      status: 'partial',
      links: [
        {
          label: {
            en: 'The API contract both sides build to',
            ms: 'Kontrak API yang digunakan kedua-dua pihak',
          },
          path: 'apps/web/src/features/applications/schemas.ts',
        },
      ],
    },
  },
  {
    id: 'fe-design-system',
    role: 'frontend',
    level: 'nice',
    label: {
      en: 'Design systems and component libraries',
      ms: 'Design system dan component library',
    },
    semakan: {
      status: 'partial',
      plan: 4,
      links: [
        {
          label: { en: 'Built on MYDS', ms: 'Dibina atas MYDS' },
          path: 'apps/web/tailwind.config.ts',
        },
        {
          label: { en: 'Own components on MYDS', ms: 'Components sendiri atas MYDS' },
          path: 'apps/web/src/features/applications/components/StatusBadge.tsx',
        },
      ],
    },
  },
  {
    id: 'fe-mobile',
    role: 'frontend',
    level: 'nice',
    label: { en: 'Mobile development', ms: 'Pembangunan mudah alih' },
    semakan: {
      status: 'partial',
      links: [
        {
          label: { en: 'Checked at 360px', ms: 'Disemak pada 360px' },
          path: 'apps/web/src/features/applications/components/ApplicationFacts.tsx',
        },
      ],
    },
  },
  {
    id: 'fe-performance',
    role: 'frontend',
    level: 'nice',
    label: {
      en: 'Frontend performance: code splitting, caching, rendering',
      ms: 'Prestasi frontend: code splitting, caching, rendering',
    },
    semakan: {
      status: 'shown',
      links: [
        { label: { en: 'Vendor chunks', ms: 'Vendor chunks' }, path: 'apps/web/vite.config.ts' },
        { label: { en: 'Lazy routes', ms: 'Lazy routes' }, path: 'apps/web/src/app/router.ts' },
      ],
    },
  },
  {
    id: 'fe-a11y',
    role: 'frontend',
    level: 'nice',
    label: {
      en: 'Accessibility: semantic HTML and ARIA',
      ms: 'Accessibility: HTML semantic dan ARIA',
    },
    semakan: {
      status: 'shown',
      links: [
        {
          label: { en: 'Accessible review form', ms: 'Borang review yang accessible' },
          path: 'apps/web/src/features/applications/components/ReviewForm.tsx',
        },
        {
          label: { en: 'Accessible chart', ms: 'Carta yang accessible' },
          path: 'apps/web/src/features/open-data/components/FuelPriceChart.tsx',
        },
      ],
    },
  },
  {
    id: 'fe-e2e',
    role: 'frontend',
    level: 'nice',
    label: { en: 'End-to-end testing (Playwright)', ms: 'Testing end-to-end (Playwright)' },
    semakan: { status: 'planned', plan: 4, links: [] },
  },
  {
    id: 'fe-observability',
    role: 'frontend',
    level: 'nice',
    label: { en: 'Frontend observability', ms: 'Observability frontend' },
    semakan: { status: 'planned', plan: 6, links: [] },
  },
  {
    id: 'fe-product',
    role: 'frontend',
    level: 'nice',
    label: { en: 'UX and product thinking', ms: 'Pemikiran UX dan produk' },
    semakan: {
      status: 'partial',
      links: [
        {
          label: { en: 'The Dev Panel', ms: 'Dev Panel' },
          path: 'apps/web/src/app/dev-panel/DevPanel.tsx',
        },
      ],
    },
  },
  {
    id: 'be-typed-services',
    role: 'backend',
    level: 'must',
    label: {
      en: 'Backend services in a statically typed language (Go, TypeScript or Python)',
      ms: 'Servis backend dalam bahasa typed secara statik (Go, TypeScript atau Python)',
    },
    semakan: { status: 'planned', plan: 6, links: [] },
  },
  {
    id: 'be-event-driven',
    role: 'backend',
    level: 'must',
    label: {
      en: 'Asynchronous and event-driven systems',
      ms: 'Sistem asynchronous dan event-driven',
    },
    semakan: { status: 'planned', plan: 6, links: [] },
  },
  {
    id: 'be-quality',
    role: 'backend',
    level: 'must',
    label: {
      en: 'Code quality, testing and long-term maintainability',
      ms: 'Kualiti kod, testing dan kebolehselenggaraan jangka panjang',
    },
    semakan: {
      status: 'partial',
      plan: 6,
      links: [
        { label: { en: 'Tests and CI', ms: 'Tests dan CI' }, path: '.github/workflows/ci.yml' },
      ],
    },
  },
  {
    id: 'be-oncall',
    role: 'backend',
    level: 'must',
    label: {
      en: 'On-call and production issues, handled together',
      ms: 'On-call dan isu production, dikendalikan bersama',
    },
    semakan: { status: 'planned', plan: 6, links: [] },
  },
  {
    id: 'be-api-design',
    role: 'backend',
    level: 'nice',
    label: {
      en: 'Designing scalable APIs (REST, GraphQL)',
      ms: 'Reka bentuk API yang scalable (REST, GraphQL)',
    },
    semakan: {
      status: 'partial',
      plan: 6,
      links: [
        {
          label: { en: 'The REST contract', ms: 'Kontrak REST' },
          path: 'apps/web/src/features/applications/schemas.ts',
        },
        {
          label: { en: 'The mock handlers', ms: 'Mock handlers' },
          path: 'apps/web/src/mocks/handlers/applications.ts',
        },
      ],
    },
  },
  {
    id: 'be-microservices',
    role: 'backend',
    level: 'nice',
    label: {
      en: 'Microservices and event-driven architecture',
      ms: 'Microservices dan seni bina event-driven',
    },
    semakan: { status: 'planned', plan: 6, links: [] },
  },
  {
    id: 'be-ddd',
    role: 'backend',
    level: 'nice',
    label: { en: 'Domain-driven design', ms: 'Domain-driven design' },
    semakan: {
      status: 'partial',
      plan: 6,
      links: [
        {
          label: { en: 'Review rules in one place', ms: 'Peraturan review di satu tempat' },
          path: 'apps/web/src/mocks/db/applications.ts',
        },
      ],
    },
  },
  {
    id: 'be-database',
    role: 'backend',
    level: 'nice',
    label: {
      en: 'Database design and optimisation (SQL, NoSQL)',
      ms: 'Reka bentuk dan optimisasi database (SQL, NoSQL)',
    },
    semakan: { status: 'planned', plan: 6, links: [] },
  },
  {
    id: 'be-performance',
    role: 'backend',
    level: 'nice',
    label: {
      en: 'Performance: caching, concurrency, load handling',
      ms: 'Prestasi: caching, concurrency, pengendalian load',
    },
    semakan: {
      status: 'partial',
      plan: 6,
      links: [
        {
          label: {
            en: "Client cache tuned to the publisher's update schedule",
            ms: 'Cache klien ditala mengikut jadual kemas kini penerbit',
          },
          path: 'apps/web/src/features/open-data/api/queries.ts',
        },
      ],
    },
  },
  {
    id: 'be-testing',
    role: 'backend',
    level: 'nice',
    label: {
      en: 'Automated testing: unit, integration, end-to-end',
      ms: 'Testing automated: unit, integration, end-to-end',
    },
    semakan: {
      status: 'partial',
      plan: 6,
      links: [
        {
          label: { en: 'Handler tests', ms: 'Handler tests' },
          path: 'apps/web/src/mocks/handlers/applications.test.ts',
        },
      ],
    },
  },
  {
    id: 'be-observability',
    role: 'backend',
    level: 'nice',
    label: {
      en: 'Observability: monitoring, logging, tracing',
      ms: 'Observability: monitoring, logging, tracing',
    },
    semakan: { status: 'planned', plan: 6, links: [] },
  },
  {
    id: 'be-cloud',
    role: 'backend',
    level: 'nice',
    label: {
      en: 'Cloud infrastructure and deployment',
      ms: 'Infrastruktur cloud dan deployment',
    },
    semakan: {
      status: 'partial',
      plan: 6,
      links: [{ label: { en: 'Vercel deploy', ms: 'Vercel deploy' }, path: 'vercel.json' }],
    },
  },
  {
    id: 'be-cicd',
    role: 'backend',
    level: 'nice',
    label: { en: 'CI/CD and DevOps practices', ms: 'Amalan CI/CD dan DevOps' },
    semakan: {
      status: 'shown',
      links: [
        { label: { en: 'CI pipeline', ms: 'CI pipeline' }, path: '.github/workflows/ci.yml' },
      ],
    },
  },
  {
    id: 'be-security',
    role: 'backend',
    level: 'nice',
    label: {
      en: 'Security: authentication, authorisation, data protection',
      ms: 'Security: authentication, authorisation, perlindungan data',
    },
    semakan: { status: 'planned', plan: 6, links: [] },
  },
  {
    id: 'be-system-design',
    role: 'backend',
    level: 'nice',
    label: {
      en: 'System design and product thinking',
      ms: 'Reka bentuk sistem dan pemikiran produk',
    },
    semakan: {
      status: 'partial',
      plan: 6,
      links: [
        {
          label: { en: 'Design spec', ms: 'Spesifikasi reka bentuk (design spec)' },
          path: 'docs/specs/2026-09-23-semakan-design.md',
        },
      ],
    },
  },
] as const;

/** An invalid `id` anywhere else in the content is a type error, via this derived union. */
export type RequirementId = (typeof REQUIREMENTS_DATA)[number]['id'];

/** `role`, `level`, `status`, `plan` and `path` are not language-specific, so only prose is `Localized`. */
export type Requirement = {
  id: RequirementId;
  role: Role;
  level: RequirementLevel;
  label: Localized<string>;
  semakan: {
    status: SemakanStatus;
    plan?: number;
    links: readonly RequirementLink[];
  };
};

// Checked against `Requirement` here (each literal `id` above is a member of `RequirementId`,
// since `RequirementId` is derived from this same array) and widened back to `Requirement[]` for
// ergonomic consumption elsewhere (e.g. so `semakan.plan` reads as the ordinary optional field it
// is, not a per-entry literal that only some union members happen to have).
export const REQUIREMENTS: readonly Requirement[] = REQUIREMENTS_DATA;
