import type { Localized } from '../localized';

export type ArchitectureLayer = { name: string; text: string; paths: string[] };
export type TraceStep = { title: string; text: string; path: string; region?: string };

export type ArchitectureContent = {
  title: Localized<string>;
  intro: Localized<string>;
  layers: Localized<ArchitectureLayer[]>;
  diagramLabel: Localized<string>;
  trace: {
    title: Localized<string>;
    steps: Localized<TraceStep[]>;
  };
};

export const architecture: ArchitectureContent = {
  title: { en: 'Architecture', ms: 'Seni bina' },
  intro: {
    en: 'Each layer has one job, and the lint rules stop features from reaching into each other.',
    ms: 'Setiap lapisan mempunyai satu tugas, dan peraturan lint menghalang features daripada mencerobohi satu sama lain.',
  },
  layers: {
    en: [
      {
        name: 'Routes',
        text: 'Read the URL, call hooks, compose components. Every page is loaded lazily.',
        paths: ['src/app/router.ts', 'src/features/applications/routes/ListRoute.tsx'],
      },
      {
        name: 'Feature hooks',
        text: 'Queries, mutations and URL state. Components never fetch on their own.',
        paths: [
          'src/features/applications/api/queries.ts',
          'src/features/applications/api/mutations.ts',
          'src/features/applications/hooks/useApplicationFilters.ts',
        ],
      },
      {
        name: 'API client and contract',
        text: 'Every response is parsed with a zod schema; a failure becomes a typed ApiError with a kind the UI can switch on.',
        paths: [
          'src/shared/api/client.ts',
          'src/shared/api/ApiError.ts',
          'src/features/applications/schemas.ts',
        ],
      },
      {
        name: 'Network',
        text: "The app's own API is mocked with MSW, in tests and in production. data.gov.my is called for real.",
        paths: ['src/mocks/handlers/applications.ts', 'src/mocks/handlers/dataGov.ts'],
      },
    ],
    ms: [
      {
        name: 'Routes',
        text: 'Baca URL, panggil hooks, gubah components. Setiap halaman dimuatkan secara lazy.',
        paths: ['src/app/router.ts', 'src/features/applications/routes/ListRoute.tsx'],
      },
      {
        name: 'Feature hooks',
        text: 'Queries, mutations dan URL state. Components tidak pernah fetch data sendiri.',
        paths: [
          'src/features/applications/api/queries.ts',
          'src/features/applications/api/mutations.ts',
          'src/features/applications/hooks/useApplicationFilters.ts',
        ],
      },
      {
        name: 'API client and contract',
        text: "Setiap response diparse dengan zod schema; kegagalan menjadi ApiError typed dengan 'kind' yang boleh disemak oleh UI.",
        paths: [
          'src/shared/api/client.ts',
          'src/shared/api/ApiError.ts',
          'src/features/applications/schemas.ts',
        ],
      },
      {
        name: 'Network',
        text: 'API aplikasi ini sendiri dimock dengan MSW, dalam ujian dan production. data.gov.my dipanggil secara sebenar.',
        paths: ['src/mocks/handlers/applications.ts', 'src/mocks/handlers/dataGov.ts'],
      },
    ],
  },
  diagramLabel: {
    en: 'Four layers, top to bottom: routes call feature hooks; hooks call the API client; the client sends requests to the network layer, either the MSW mock API or data.gov.my, and validates every response on the way back.',
    ms: 'Empat lapisan, dari atas ke bawah: routes memanggil feature hooks; hooks memanggil API client; client menghantar request ke lapisan network, sama ada MSW mock API atau data.gov.my, dan mengesahkan setiap response dalam perjalanan pulang.',
  },
  trace: {
    title: {
      en: 'One request, end to end: an officer records a decision',
      ms: 'Satu request, hujung ke hujung: seorang pegawai merekod keputusan',
    },
    steps: {
      en: [
        {
          title: 'The form validates first',
          text: 'react-hook-form checks the decision against the same zod schema the server uses.',
          path: 'src/features/applications/components/ReviewForm.tsx',
        },
        {
          title: 'The screen updates immediately',
          text: 'The mutation changes the status in the detail and in every cached list page before the server answers.',
          path: 'src/features/applications/api/mutations.ts',
        },
        {
          title: 'The request is validated both ways',
          text: 'apiClient posts the decision and parses the reply against ApplicationDetailSchema.',
          path: 'src/shared/api/client.ts',
        },
        {
          title: 'The server applies its rules',
          text: 'The mock server checks the version (409 on a conflict) and rules the UI does not know, such as the fire safety certificate (422 with an error code).',
          path: 'src/mocks/db/applications.ts',
        },
        {
          title: 'The UI settles',
          text: 'Success replaces the cache; a failure rolls it back; 422 codes land on the right field; a 409 shows the conflict banner and keeps what the officer typed.',
          path: 'src/features/applications/routes/ReviewRoute.tsx',
        },
      ],
      ms: [
        {
          title: 'Borang disahkan dahulu',
          text: 'react-hook-form menyemak keputusan berdasarkan zod schema yang sama digunakan oleh server.',
          path: 'src/features/applications/components/ReviewForm.tsx',
        },
        {
          title: 'Skrin dikemas kini serta-merta',
          text: 'Mutation menukar status dalam perincian dan dalam setiap halaman senarai yang dicache sebelum server memberi jawapan.',
          path: 'src/features/applications/api/mutations.ts',
        },
        {
          title: 'Request disahkan pada kedua-dua arah',
          text: 'apiClient menghantar (post) keputusan dan mem-parse jawapan berdasarkan ApplicationDetailSchema.',
          path: 'src/shared/api/client.ts',
        },
        {
          title: 'Server menguatkuasakan peraturannya',
          text: 'Mock server menyemak versi (409 apabila berlaku conflict) dan peraturan yang tidak diketahui oleh UI, seperti sijil keselamatan kebakaran (422 dengan kod ralat).',
          path: 'src/mocks/db/applications.ts',
        },
        {
          title: 'UI menjadi stabil',
          text: 'Success menggantikan cache; failure roll back cache; kod 422 diletakkan pada field yang betul; 409 memaparkan conflict banner dan mengekalkan apa yang ditaip oleh pegawai.',
          path: 'src/features/applications/routes/ReviewRoute.tsx',
        },
      ],
    },
  },
};
