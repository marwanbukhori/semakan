import type { Localized } from '../localized';
import { REPO_URL } from '../source/repo';

export type TourLink = { label: string; href: string };
export type FolderEntry = { path: string; text: string };

export type OverviewContent = {
  title: Localized<string>;
  intro: Localized<string[]>;
  /** Product/library names: identical in both languages, so not wrapped in Localized. */
  stack: string[];
  tour: Localized<TourLink[]>;
  tourNote: Localized<string>;
  folders: Localized<FolderEntry[]>;
};

export const CI_BADGE_URL =
  'https://github.com/marwanbukhori/semakan/actions/workflows/ci.yml/badge.svg';
export const CI_WORKFLOW_URL = 'https://github.com/marwanbukhori/semakan/actions/workflows/ci.yml';
export const LIVE_APP_URL = 'https://semakan-plum.vercel.app';

export const overview: OverviewContent = {
  title: { en: 'About this build', ms: 'Tentang binaan ini' },
  intro: {
    en: [
      'Semakan is a demo of a government web application. Council officers review business premises licence applications, and anyone can check weekly fuel prices published on data.gov.my.',
      'I built it to show how I work: typed contracts at every boundary, accessible components from the Malaysia Government Design System (MYDS), tests that describe behaviour, and an AI-assisted workflow in which every task is reviewed before the next one starts.',
      'It is the demo for two interviews, Frontend Engineer and Backend Developer. The backend service comes next, built against the same API contract the frontend already uses.',
    ],
    ms: [
      'Semakan ialah demo aplikasi web kerajaan. Pegawai majlis menyemak permohonan lesen premis perniagaan, dan sesiapa sahaja boleh menyemak harga bahan api mingguan yang diterbitkan di data.gov.my.',
      'Saya membinanya untuk menunjukkan cara saya bekerja: kontrak jenis (typed contracts) pada setiap sempadan, komponen boleh akses daripada Malaysia Government Design System (MYDS), ujian yang menerangkan gelagat sistem, dan aliran kerja berbantukan AI di mana setiap tugasan disemak sebelum tugasan seterusnya bermula.',
      'Ini adalah demo untuk dua temu duga, Frontend Engineer dan Backend Developer. Perkhidmatan backend akan dibina seterusnya, berdasarkan kontrak API yang sama yang telah digunakan oleh frontend.',
    ],
  },
  stack: [
    'React 19',
    'TypeScript',
    'Vite',
    'React Router',
    'TanStack Query',
    'zod',
    'react-hook-form',
    'MYDS + Tailwind CSS',
    'i18next (BM/EN)',
    'MSW',
    'Vitest + Testing Library',
    'GitHub Actions',
    'Vercel',
  ],
  tour: {
    en: [
      { label: 'Licence applications', href: '/applications' },
      { label: 'A review decision (dialog)', href: '/applications/app-001/review' },
      { label: 'Fuel prices from data.gov.my', href: '/open-data/fuel-prices' },
      { label: 'Source code on GitHub', href: REPO_URL },
    ],
    ms: [
      { label: 'Permohonan lesen', href: '/applications' },
      { label: 'Keputusan semakan (dialog)', href: '/applications/app-001/review' },
      { label: 'Harga bahan api daripada data.gov.my', href: '/open-data/fuel-prices' },
      { label: 'Kod sumber di GitHub', href: REPO_URL },
    ],
  },
  tourNote: {
    en: 'Open the Dev Panel (bottom right) to slow the API down, force errors or empty results, or switch data.gov.my between live and recorded data.',
    ms: 'Buka Panel Dev (kanan bawah) untuk memperlahankan API, memaksa ralat atau keputusan kosong, atau menukar data.gov.my antara data langsung dan data rakaman.',
  },
  folders: {
    en: [
      {
        path: 'src/app',
        text: 'The shell: routes, layout, providers, error boundaries, and the Dev Panel that controls the mock API.',
      },
      {
        path: 'src/features/applications',
        text: 'Licence applications: list, detail and the review dialog. Schemas, queries, mutations, hooks and components live together.',
      },
      {
        path: 'src/features/open-data',
        text: 'Fuel prices from the real data.gov.my API: the contract, the client, URL filters and the SVG chart.',
      },
      {
        path: 'src/features/about',
        text: 'These pages. Content is typed data in both languages; code excerpts are read from the real source.',
      },
      {
        path: 'src/shared',
        text: 'Code any feature may use: the validated API client, ApiError, i18n, formatting, hooks and shared UI.',
      },
      {
        path: 'src/mocks',
        text: "The mock API (MSW): seeded data, the review rules the 'server' enforces, and the data.gov.my switch.",
      },
      { path: 'docs', text: 'The specs, the implementation plans and the published review logs.' },
      {
        path: '.github/workflows',
        text: 'CI: typecheck, lint, format, tests with coverage and the production build.',
      },
    ],
    ms: [
      {
        path: 'src/app',
        text: 'Cangkerang aplikasi: routes, susun atur, providers, sempadan ralat (error boundaries), dan Panel Dev yang mengawal API olok-olok.',
      },
      {
        path: 'src/features/applications',
        text: 'Permohonan lesen: senarai, perincian dan dialog semakan. Schemas, queries, mutations, hooks dan components berada bersama.',
      },
      {
        path: 'src/features/open-data',
        text: 'Harga bahan api daripada API data.gov.my sebenar: contract, client, penapis URL dan carta SVG.',
      },
      {
        path: 'src/features/about',
        text: 'Halaman-halaman ini. Kandungan adalah data typed dalam kedua-dua bahasa; petikan kod dibaca daripada kod sumber sebenar.',
      },
      {
        path: 'src/shared',
        text: 'Kod yang boleh digunakan oleh mana-mana feature: API client yang disahkan, ApiError, i18n, pemformatan, hooks dan UI kongsi.',
      },
      {
        path: 'src/mocks',
        text: "API olok-olok (MSW): data seed, peraturan semakan yang dikuatkuasakan oleh 'server', dan suis data.gov.my.",
      },
      { path: 'docs', text: 'Spesifikasi, pelan pelaksanaan dan log semakan yang diterbitkan.' },
      {
        path: '.github/workflows',
        text: 'CI: typecheck, lint, format, ujian dengan coverage dan production build.',
      },
    ],
  },
};
