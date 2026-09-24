import type { Localized } from '../localized';

export type PracticeStatus = 'enforced' | 'partial' | 'planned';

/** `source` (path/region), `status` and `plan` are not language-specific, so only the prose is `Localized`. */
export type Practice = {
  id: string;
  title: Localized<string>;
  what: Localized<string>;
  why: Localized<string>;
  enforcedBy: Localized<string>;
  status: PracticeStatus;
  plan?: number;
  source: { path: string; region: string };
};

export const PRACTICES: readonly Practice[] = [
  {
    id: 'strict-typescript',
    title: { en: 'Strict TypeScript, no `any`', ms: 'TypeScript ketat, tiada `any`' },
    what: {
      en: 'Strict mode with unchecked index access, plus a lint error for `any`.',
      ms: 'Strict mode dengan unchecked index access, ditambah ralat lint untuk `any`.',
    },
    why: {
      en: 'Values that might be missing must be handled before use.',
      ms: 'Nilai yang mungkin tiada mesti dikendalikan sebelum digunakan.',
    },
    enforcedBy: {
      en: 'The TypeScript compiler and typescript-eslint, in CI.',
      ms: 'Kompilator TypeScript dan typescript-eslint, dalam CI.',
    },
    status: 'enforced',
    source: { path: 'apps/web/tsconfig.app.json', region: 'strict-typescript' },
  },
  {
    id: 'exhaustive-switch',
    title: {
      en: 'Discriminated unions, handled exhaustively',
      ms: 'Discriminated unions, dikendalikan secara menyeluruh',
    },
    what: {
      en: 'Timeline events and review decisions are unions on one field, and every `switch` ends in `assertNever`.',
      ms: 'Timeline events dan review decisions adalah unions berdasarkan satu field, dan setiap `switch` berakhir dengan `assertNever`.',
    },
    why: {
      en: 'Adding a new kind without handling it everywhere becomes a compile error, not a blank screen.',
      ms: 'Menambah jenis baharu tanpa mengendalikannya di semua tempat menjadi ralat kompilasi, bukan skrin kosong.',
    },
    enforcedBy: {
      en: 'The compiler, through `assertNever(value: never)`.',
      ms: 'Kompilator, melalui `assertNever(value: never)`.',
    },
    status: 'enforced',
    source: {
      path: 'apps/web/src/features/applications/components/Timeline.tsx',
      region: 'exhaustive-switch',
    },
  },
  {
    id: 'types-from-schemas',
    title: { en: 'Types come from the contract', ms: 'Types datang daripada contract' },
    what: {
      en: 'Types are inferred from zod schemas, never written twice.',
      ms: 'Types disimpulkan (inferred) daripada zod schemas, tidak pernah ditulis dua kali.',
    },
    why: {
      en: "The runtime check and the type can't disagree.",
      ms: 'Semakan runtime dan type tidak boleh bercanggah.',
    },
    enforcedBy: {
      en: '`z.infer` and the type check in CI.',
      ms: '`z.infer` dan semakan type dalam CI.',
    },
    status: 'enforced',
    source: { path: 'packages/contract/src/types.ts', region: 'types-from-schemas' },
  },
  {
    id: 'composition',
    title: { en: 'Composition over configuration', ms: 'Composition berbanding configuration' },
    what: {
      en: 'Components take content, not flags: the table receives its empty state as an element.',
      ms: 'Components menerima kandungan, bukan flags: table menerima empty state-nya sebagai satu element.',
    },
    why: {
      en: 'Fewer boolean props means fewer combinations to test and fewer surprises.',
      ms: 'Lebih sedikit boolean props bermakna lebih sedikit kombinasi untuk diuji dan lebih sedikit kejutan.',
    },
    enforcedBy: {
      en: 'Code review. Storybook stories for each state are planned.',
      ms: 'Code review. Storybook stories untuk setiap state dirancang.',
    },
    status: 'partial',
    plan: 4,
    source: {
      path: 'apps/web/src/features/applications/routes/ListRoute.tsx',
      region: 'composition',
    },
  },
  {
    id: 'thin-routes',
    title: { en: 'Thin routes, logic in hooks', ms: 'Routes nipis, logik dalam hooks' },
    what: {
      en: 'A route reads the URL, calls hooks and composes components.',
      ms: 'Satu route membaca URL, memanggil hooks dan menggubah components.',
    },
    why: {
      en: 'Logic in hooks can be tested without rendering a page.',
      ms: 'Logik dalam hooks boleh diuji tanpa merender halaman.',
    },
    enforcedBy: {
      en: 'Folder conventions, and the boundaries lint rule for imports. The route size itself is checked in review.',
      ms: 'Konvensyen folder, dan peraturan lint boundaries untuk imports. Saiz route sendiri disemak semasa review.',
    },
    status: 'partial',
    source: {
      path: 'apps/web/src/features/open-data/routes/FuelPricesRoute.tsx',
      region: 'thin-routes',
    },
  },
  {
    id: 'derive-dont-sync',
    title: { en: "Derive state, don't copy it", ms: 'Derive state, jangan salin' },
    what: {
      en: 'Filters are parsed from the URL on every render instead of being copied into component state.',
      ms: 'Filters diparse daripada URL pada setiap render, bukannya disalin ke dalam component state.',
    },
    why: {
      en: 'One source of truth: back, forward and shared links just work.',
      ms: 'Satu source of truth: back, forward dan pautan dikongsi berfungsi begitu sahaja.',
    },
    enforcedBy: {
      en: 'react-hooks lint (React Compiler rules) and review.',
      ms: 'react-hooks lint (peraturan React Compiler) dan review.',
    },
    status: 'partial',
    source: {
      path: 'apps/web/src/features/applications/hooks/useApplicationFilters.ts',
      region: 'derive-dont-sync',
    },
  },
  {
    id: 'stable-keys',
    title: { en: 'Stable keys for lists', ms: 'Keys stabil untuk senarai' },
    what: {
      en: 'List items are keyed by their id, not their position.',
      ms: 'Item senarai diberikan key berdasarkan id, bukan kedudukannya.',
    },
    why: {
      en: 'Sorting or filtering must not mix up the state of rows.',
      ms: 'Sorting atau filtering tidak boleh mengelirukan state bagi setiap baris.',
    },
    enforcedBy: {
      en: 'Code review. No lint rule enforces it yet.',
      ms: 'Code review. Tiada peraturan lint menguatkuasakannya lagi.',
    },
    status: 'partial',
    source: {
      path: 'apps/web/src/features/applications/components/ApplicationTable.tsx',
      region: 'stable-keys',
    },
  },
  {
    id: 'measured-memo',
    title: { en: 'Memoise where it pays', ms: 'Memoise di tempat yang berbaloi' },
    what: {
      en: 'The chart memoises its geometry because hovering re-renders it on every pointer move; the rest of the app does not memoise by default.',
      ms: 'Carta memoise geometrinya kerana hovering menyebabkan ia re-render pada setiap pergerakan pointer; selebihnya aplikasi ini tidak memoise secara lalai.',
    },
    why: {
      en: 'Memoisation has a cost; it earns its place only where renders are frequent.',
      ms: 'Memoisation mempunyai kos; ia wajar digunakan hanya di tempat render berlaku dengan kerap.',
    },
    enforcedBy: {
      en: 'Review. No profiler measurements are recorded yet.',
      ms: 'Review. Tiada ukuran profiler direkodkan lagi.',
    },
    status: 'partial',
    source: {
      path: 'apps/web/src/features/open-data/components/FuelPriceChart.tsx',
      region: 'measured-memo',
    },
  },
  {
    id: 'validate-at-boundary',
    title: {
      en: 'Validate every response at the boundary',
      ms: 'Sahkan setiap response pada boundary',
    },
    what: {
      en: "The API client requires a schema for every call; a mismatch is logged and becomes an ApiError of kind 'schema'.",
      ms: "API client memerlukan schema untuk setiap panggilan; ketidakpadanan direkod (logged) dan menjadi ApiError berjenis 'schema'.",
    },
    why: {
      en: 'Bad data fails loudly at the edge instead of deep in the UI.',
      ms: 'Data yang tidak sah gagal secara jelas di sempadan, bukannya jauh di dalam UI.',
    },
    enforcedBy: {
      en: "The client's function signature, so a call without a schema does not compile.",
      ms: 'Function signature client itu sendiri, jadi panggilan tanpa schema tidak akan dikompil.',
    },
    status: 'enforced',
    source: { path: 'apps/web/src/shared/api/client.ts', region: 'validate-at-boundary' },
  },
  {
    id: 'query-keys',
    title: {
      en: 'One query-key factory per feature',
      ms: 'Satu query-key factory bagi setiap feature',
    },
    what: {
      en: 'Keys are built in one place and nested (all → lists → one list).',
      ms: 'Keys dibina di satu tempat dan bersarang (nested) (all → lists → one list).',
    },
    why: {
      en: 'One invalidation reaches every page of a list, and keys never collide.',
      ms: 'Satu invalidation sampai ke setiap halaman senarai, dan keys tidak pernah berlanggar.',
    },
    enforcedBy: {
      en: 'Unit tests on the key factory.',
      ms: 'Unit tests ke atas key factory.',
    },
    status: 'enforced',
    source: { path: 'apps/web/src/features/applications/api/keys.ts', region: 'query-keys' },
  },
  {
    id: 'url-state',
    title: { en: 'The URL is the state for filters', ms: 'URL adalah state bagi filters' },
    what: {
      en: 'Filters, sorting, pages, ranges and visible fuels live in the URL, parsed with zod and without default values.',
      ms: 'Filters, sorting, halaman, ranges dan fuels yang dipaparkan disimpan dalam URL, diparse dengan zod dan tanpa default values.',
    },
    why: {
      en: 'Any view can be shared or bookmarked, and Back works as expected.',
      ms: 'Mana-mana paparan boleh dikongsi atau di-bookmark, dan butang Back berfungsi seperti dijangka.',
    },
    enforcedBy: {
      en: 'Integration tests on the list and fuel pages.',
      ms: 'Integration tests ke atas halaman senarai dan halaman fuel.',
    },
    status: 'enforced',
    source: {
      path: 'apps/web/src/features/open-data/hooks/useFuelFilters.ts',
      region: 'url-state',
    },
  },
  {
    id: 'async-states',
    title: {
      en: 'Every async view has all four states',
      ms: 'Setiap paparan async mempunyai keempat-empat state',
    },
    what: {
      en: 'Loading, empty, error and success, with a message for each error kind and a dimmed frame while refetching. The excerpt shows how each error kind maps to its own message.',
      ms: 'Loading, empty, error dan success, dengan mesej bagi setiap jenis ralat dan frame malap semasa refetching. Petikan ini menunjukkan bagaimana setiap jenis ralat dipetakan kepada mesejnya sendiri.',
    },
    why: {
      en: 'Real networks are slow and fail; the Dev Panel shows every state live.',
      ms: 'Rangkaian sebenar adalah perlahan dan boleh gagal; Dev Panel memaparkan setiap state secara langsung.',
    },
    enforcedBy: {
      en: 'Integration tests for each state. A Storybook story per state is planned.',
      ms: 'Integration tests untuk setiap state. Storybook story bagi setiap state dirancang.',
    },
    status: 'partial',
    plan: 4,
    source: { path: 'apps/web/src/shared/api/errorMessage.ts', region: 'async-states' },
  },
  {
    id: 'semantic-forms',
    title: { en: 'Semantic, labelled, linked', ms: 'Semantic, dilabel, dipautkan' },
    what: {
      en: 'Every field has a label; errors are linked with aria-describedby and marked with aria-invalid; focus moves to the first invalid field.',
      ms: 'Setiap field mempunyai label; ralat dipautkan dengan aria-describedby dan ditanda dengan aria-invalid; focus beralih ke field tidak sah yang pertama.',
    },
    why: {
      en: 'Screen-reader users hear what went wrong and where.',
      ms: 'Pengguna screen-reader dapat mendengar apa yang tidak kena dan di mana.',
    },
    enforcedBy: {
      en: 'jsx-a11y lint and tests by role and label. Automated axe checks are planned.',
      ms: 'jsx-a11y lint dan tests mengikut role dan label. Semakan axe automatik dirancang.',
    },
    status: 'partial',
    plan: 4,
    source: {
      path: 'apps/web/src/features/applications/components/ReviewForm.tsx',
      region: 'semantic-forms',
    },
  },
  {
    id: 'keyboard',
    title: {
      en: 'Everything works from the keyboard',
      ms: 'Semuanya berfungsi menggunakan papan kekunci',
    },
    what: {
      en: 'The review dialog traps focus and returns it on close; the chart can be read week by week with arrow keys.',
      ms: 'Dialog review memerangkap focus dan memulangkannya semula apabila ditutup; carta boleh dibaca minggu demi minggu dengan arrow keys.',
    },
    why: {
      en: "Many officers use the keyboard, and some can't use a mouse at all.",
      ms: 'Ramai pegawai menggunakan papan kekunci, dan sesetengahnya langsung tidak boleh menggunakan tetikus.',
    },
    enforcedBy: {
      en: 'Component tests for focus and keys. End-to-end keyboard journeys are planned.',
      ms: 'Component tests untuk focus dan keys. Keyboard journeys end-to-end dirancang.',
    },
    status: 'partial',
    plan: 4,
    source: {
      path: 'apps/web/src/features/open-data/components/FuelPriceChart.tsx',
      region: 'keyboard',
    },
  },
  {
    id: 'test-behaviour',
    title: { en: 'Tests describe behaviour', ms: 'Tests menerangkan gelagat (behaviour)' },
    what: {
      en: 'Tests query by role and label and assert what a user can see; the network is mocked only at the HTTP layer.',
      ms: 'Tests query mengikut role dan label serta assert apa yang boleh dilihat oleh pengguna; network hanya dimock pada lapisan HTTP.',
    },
    why: {
      en: 'Tests survive refactors and double as accessibility checks.',
      ms: 'Tests kekal sah walaupun selepas refactors dan turut berfungsi sebagai semakan accessibility.',
    },
    enforcedBy: {
      en: 'Conventions in AGENTS.md and code review; the CI coverage threshold checks that tests exist, not how they are written.',
      ms: 'Konvensyen dalam AGENTS.md dan code review; coverage threshold dalam CI menyemak bahawa tests wujud, bukan cara ia ditulis.',
    },
    status: 'partial',
    source: {
      path: 'apps/web/src/features/applications/routes/ReviewRoute.test.tsx',
      region: 'test-behaviour',
    },
  },
  {
    id: 'feature-boundaries',
    title: {
      en: "Features don't import each other",
      ms: 'Features tidak import antara satu sama lain',
    },
    what: {
      en: 'A feature may import only itself and shared code.',
      ms: 'Satu feature hanya boleh import dirinya sendiri dan shared code.',
    },
    why: {
      en: 'Features stay independent and can be changed or removed safely.',
      ms: 'Features kekal bebas (independent) dan boleh diubah atau dibuang dengan selamat.',
    },
    enforcedBy: {
      en: 'eslint-plugin-boundaries, in CI.',
      ms: 'eslint-plugin-boundaries, dalam CI.',
    },
    status: 'enforced',
    source: { path: 'apps/web/eslint.config.js', region: 'feature-boundaries' },
  },
  {
    id: 'code-splitting',
    title: { en: 'Split by route and by vendor', ms: 'Dipisahkan mengikut route dan vendor' },
    what: {
      en: 'Every page is a lazy chunk, and framework code is split into cacheable vendor chunks.',
      ms: 'Setiap halaman adalah lazy chunk, dan kod framework dipisahkan kepada vendor chunks yang boleh di-cache.',
    },
    why: {
      en: 'The first page loads only what it needs.',
      ms: 'Halaman pertama hanya memuatkan apa yang diperlukannya.',
    },
    enforcedBy: {
      en: "Lazy routes and build configuration. The build's chunk-size warning is visible in CI but does not fail it yet.",
      ms: 'Lazy routes dan konfigurasi build. Amaran saiz chunk daripada build kelihatan dalam CI tetapi belum menggagalkannya lagi.',
    },
    status: 'partial',
    source: { path: 'apps/web/vite.config.ts', region: 'code-splitting' },
  },
  {
    id: 'typed-translations',
    title: {
      en: 'No hardcoded text, in two languages',
      ms: 'Tiada teks hardcoded, dalam dua bahasa',
    },
    what: {
      en: "All UI text goes through i18next, and the Malay file must have exactly the English file's keys.",
      ms: 'Semua teks UI melalui i18next, dan fail Bahasa Melayu mesti mempunyai keys yang sama tepat seperti fail Bahasa Inggeris.',
    },
    why: {
      en: 'A missing translation is caught by the compiler, not by a user.',
      ms: 'Terjemahan yang tertinggal dikesan oleh kompilator, bukan oleh pengguna.',
    },
    enforcedBy: {
      en: 'The type checker, for key parity. No lint rule catches literal text in JSX yet.',
      ms: 'Type checker, untuk key parity. Tiada peraturan lint mengesan teks literal dalam JSX lagi.',
    },
    status: 'partial',
    source: { path: 'apps/web/src/shared/i18n/en.ts', region: 'typed-translations' },
  },
  {
    id: 'optimistic-rollback',
    title: {
      en: 'Optimistic updates that roll back',
      ms: 'Optimistic updates yang boleh roll back',
    },
    what: {
      en: 'A decision shows immediately in the detail and in every cached list page, and is restored exactly if the server refuses.',
      ms: 'Keputusan dipaparkan serta-merta dalam perincian dan dalam setiap halaman senarai yang dicache, dan dipulihkan semula dengan tepat jika server menolaknya.',
    },
    why: {
      en: 'The interface feels instant without lying when a request fails.',
      ms: 'Antara muka terasa segera tanpa menipu apabila sesuatu request gagal.',
    },
    enforcedBy: {
      en: 'Mutation tests for both success and rollback.',
      ms: 'Mutation tests untuk kedua-dua success dan rollback.',
    },
    status: 'enforced',
    source: {
      path: 'apps/web/src/features/applications/api/mutations.ts',
      region: 'optimistic-rollback',
    },
  },
  {
    id: 'accessible-chart',
    title: {
      en: 'Charts people can read without seeing them',
      ms: 'Carta yang boleh dibaca orang ramai tanpa perlu melihatnya',
    },
    what: {
      en: 'A text summary, a keyboard readout, a full data table, and a colour palette validated for colour blindness and contrast in both themes.',
      ms: 'Ringkasan teks, bacaan papan kekunci (keyboard readout), jadual data penuh, dan palet warna yang disahkan untuk buta warna dan kontras dalam kedua-dua tema.',
    },
    why: {
      en: 'A chart is only one way into the data.',
      ms: 'Carta hanyalah satu cara untuk mengakses data.',
    },
    enforcedBy: {
      en: 'Component tests for the summary, the readout and the table. The palette was validated with a checking script. Automated axe checks are planned.',
      ms: 'Component tests untuk ringkasan, bacaan dan jadual. Palet disahkan menggunakan skrip semakan. Semakan axe automatik dirancang.',
    },
    status: 'partial',
    plan: 4,
    source: {
      path: 'apps/web/src/features/open-data/components/ChartDataTable.tsx',
      region: 'accessible-chart',
    },
  },
];
