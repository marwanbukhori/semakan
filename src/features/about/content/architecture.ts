import type { Localized } from '../localized';

/** Source paths are not language-specific, so only `name`/`text` are localised. */
export type ArchitectureLayer = {
  name: Localized<string>;
  text: Localized<string>;
  paths: string[];
};
/** `path`/`region` are not language-specific, so only `title`/`text` are localised. */
export type TraceStep = {
  title: Localized<string>;
  text: Localized<string>;
  path: string;
  region?: string;
};

export type ArchitectureContent = {
  title: Localized<string>;
  intro: Localized<string>;
  layers: ArchitectureLayer[];
  diagramLabel: Localized<string>;
  trace: {
    title: Localized<string>;
    steps: TraceStep[];
  };
};

export const architecture: ArchitectureContent = {
  title: { en: 'Architecture', ms: 'Seni bina' },
  intro: {
    en: 'Each layer has one job, and the lint rules stop features from reaching into each other.',
    ms: 'Setiap lapisan mempunyai satu tugas, dan peraturan lint menghalang features daripada mencerobohi satu sama lain.',
  },
  layers: [
    {
      name: { en: 'Routes', ms: 'Routes' },
      text: {
        en: 'Read the URL, call hooks, compose components. Every page is loaded lazily.',
        ms: 'Baca URL, panggil hooks, gubah components. Setiap halaman dimuatkan secara lazy.',
      },
      paths: ['src/app/router.ts', 'src/features/applications/routes/ListRoute.tsx'],
    },
    {
      name: { en: 'Feature hooks', ms: 'Feature hooks' },
      text: {
        en: 'Queries, mutations and URL state. Components never fetch on their own.',
        ms: 'Queries, mutations dan URL state. Components tidak pernah fetch data sendiri.',
      },
      paths: [
        'src/features/applications/api/queries.ts',
        'src/features/applications/api/mutations.ts',
        'src/features/applications/hooks/useApplicationFilters.ts',
      ],
    },
    {
      name: { en: 'API client and contract', ms: 'API client dan contract' },
      text: {
        en: 'Every response is parsed with a zod schema; a failure becomes a typed ApiError with a kind the UI can switch on.',
        ms: "Setiap response diparse dengan zod schema; kegagalan menjadi ApiError typed dengan 'kind' yang boleh disemak oleh UI.",
      },
      paths: [
        'src/shared/api/client.ts',
        'src/shared/api/ApiError.ts',
        'src/features/applications/schemas.ts',
      ],
    },
    {
      name: { en: 'Network', ms: 'Network' },
      text: {
        en: "The app's own API is mocked with MSW, in tests and in production. data.gov.my is called for real.",
        ms: 'API aplikasi ini sendiri dimock dengan MSW, dalam ujian dan production. data.gov.my dipanggil secara sebenar.',
      },
      paths: ['src/mocks/handlers/applications.ts', 'src/mocks/handlers/dataGov.ts'],
    },
  ],
  diagramLabel: {
    en: 'Four layers, top to bottom: routes call feature hooks; hooks call the API client; the client sends requests to the network layer, either the MSW mock API or data.gov.my, and validates every response on the way back.',
    ms: 'Empat lapisan, dari atas ke bawah: routes memanggil feature hooks; hooks memanggil API client; client menghantar request ke lapisan network, sama ada MSW mock API atau data.gov.my, dan mengesahkan setiap response dalam perjalanan pulang.',
  },
  trace: {
    title: {
      en: 'One request, end to end: an officer records a decision',
      ms: 'Satu request, hujung ke hujung: seorang pegawai merekod keputusan',
    },
    steps: [
      {
        title: { en: 'The form validates first', ms: 'Borang disahkan dahulu' },
        text: {
          en: 'react-hook-form checks the decision against the same zod schema the server uses.',
          ms: 'react-hook-form menyemak keputusan berdasarkan zod schema yang sama yang digunakan oleh server.',
        },
        path: 'src/features/applications/components/ReviewForm.tsx',
      },
      {
        title: { en: 'The screen updates immediately', ms: 'Skrin dikemas kini serta-merta' },
        text: {
          en: 'The mutation changes the status in the detail and in every cached list page before the server answers.',
          ms: 'Mutation menukar status dalam perincian dan dalam setiap halaman senarai yang dicache sebelum server memberi jawapan.',
        },
        path: 'src/features/applications/api/mutations.ts',
        region: 'optimistic-rollback',
      },
      {
        title: {
          en: 'The request is validated both ways',
          ms: 'Request disahkan pada kedua-dua arah',
        },
        text: {
          en: 'apiClient posts the decision and parses the reply against ApplicationDetailSchema.',
          ms: 'apiClient menghantar (post) keputusan dan mem-parse jawapan berdasarkan ApplicationDetailSchema.',
        },
        path: 'src/shared/api/client.ts',
        region: 'validate-at-boundary',
      },
      {
        title: { en: 'The server applies its rules', ms: 'Server menguatkuasakan peraturannya' },
        text: {
          en: 'The mock server checks the version (409 on a conflict) and rules the UI does not know, such as the fire safety certificate (422 with an error code).',
          ms: 'Mock server menyemak versi (409 apabila berlaku conflict) dan peraturan yang tidak diketahui oleh UI, seperti sijil keselamatan kebakaran (422 dengan kod ralat).',
        },
        path: 'src/mocks/db/applications.ts',
      },
      {
        title: { en: 'The UI settles', ms: 'UI menjadi stabil' },
        text: {
          en: 'Success replaces the cache; a failure rolls it back; 422 codes land on the right field; a 409 shows the conflict banner and keeps what the officer typed.',
          ms: 'Success menggantikan cache; kegagalan memulihkan cache kepada keadaan asal; kod 422 diletakkan pada field yang betul; 409 memaparkan conflict banner dan mengekalkan apa yang ditaip oleh pegawai.',
        },
        path: 'src/features/applications/routes/ReviewRoute.tsx',
      },
    ],
  },
};
