import type { Localized } from '../localized';

/** `path` is a repo-relative link to a spec/plan doc, not language-specific. */
export type PipelineStep = {
  title: Localized<string>;
  text: Localized<string>;
  path?: string;
};

/** Tool/product names are identical in both languages; only the description is `Localized`. */
export type Tool = {
  name: Localized<string>;
  text: Localized<string>;
};

export type IncidentLink = { kind: 'log'; plan: 1 | 2 | 3 } | { kind: 'commit'; sha: string };

export type Incident = {
  title: Localized<string>;
  text: Localized<string>;
  links: IncidentLink[];
};

export type PlanNumbers = {
  plan: 1 | 2 | 3;
  tasks: number;
  fixRounds: number;
  rulings: number;
};

/**
 * Repo-relative paths to the published logs, keyed by plan number, so incident links and the
 * logs section share one source of truth instead of rebuilding the path string in two places.
 */
export const REVIEW_LOG_PATHS: Record<1 | 2 | 3, string> = {
  1: 'docs/process/plan-1-review-log.md',
  2: 'docs/process/plan-2-review-log.md',
  3: 'docs/process/plan-3-review-log.md',
};
export const REVIEW_LOG_README_PATH = 'docs/process/README.md';

export type AiWorkflowContent = {
  intro: Localized<string>;
  pipeline: PipelineStep[];
  tools: Tool[];
  ownership: { own: Localized<string>[]; ai: Localized<string>[] };
  incidents: Incident[];
  /**
   * Counted from the published logs in `docs/process/`, run against `docs/process/plan-<n>-review-log.md`:
   * - tasks completed: `grep -cE '^\s*Task \d+: complete' <file>`
   * - fix rounds: `grep -cE 'fix round \d+/5 \(' <file>` plus `grep -cF 'Final fix wave: done' <file>`
   * - rulings: lines containing `Ruling`, excluding the `## Rulings` section heading itself:
   *   `grep 'Ruling' <file> | grep -vc '^#'`
   * See `scripts/publish-review-logs.mjs` and the task report for full output.
   */
  numbers: { perPlan: PlanNumbers[]; total: Omit<PlanNumbers, 'plan'> };
};

export const aiWorkflow: AiWorkflowContent = {
  intro: {
    en: 'I used AI to build Semakan the way I would run a small team: nothing is written before it is specified, nothing merges before it is reviewed, and every judgement call is written down with its cost if wrong. The logs below are the real record.',
    ms: 'Saya menggunakan AI untuk membina Semakan seperti saya menguruskan sebuah pasukan kecil: tiada apa-apa ditulis sebelum ia dispesifikasikan, tiada apa-apa di-merge sebelum ia disemak, dan setiap keputusan pertimbangan direkodkan berserta kos jika ia tersilap. Log di bawah adalah rekod sebenar.',
  },
  pipeline: [
    {
      title: { en: 'Brainstorm', ms: 'Brainstorm' },
      text: {
        en: 'Questions one at a time until the decisions are made; alternatives compared with a recommendation.',
        ms: 'Soalan satu demi satu sehingga keputusan dibuat; alternatif dibandingkan berserta cadangan.',
      },
      path: 'docs/specs/2026-09-23-semakan-design.md',
    },
    {
      title: { en: 'Specify', ms: 'Spesifikasi' },
      text: {
        en: 'A written design, approved before any code.',
        ms: 'Reka bentuk bertulis, diluluskan sebelum sebarang kod.',
      },
    },
    {
      title: { en: 'Verify before planning', ms: 'Sahkan sebelum merancang' },
      text: {
        en: 'Throwaway spikes and live API probes check real library and API behaviour instead of trusting memory. For example, MYDS needs Tailwind 3, and data.gov.my redirects without a trailing slash.',
        ms: 'Spike buang (throwaway) dan ujian API langsung menyemak gelagat sebenar library dan API, bukannya bergantung pada ingatan. Sebagai contoh, MYDS memerlukan Tailwind 3, dan data.gov.my melakukan redirect tanpa trailing slash.',
      },
    },
    {
      title: { en: 'Plan', ms: 'Merancang' },
      text: {
        en: 'Every task gets exact files, interfaces, tests and code.',
        ms: 'Setiap tugasan diberikan fail, interface, ujian dan kod yang tepat.',
      },
      path: 'docs/plans/2026-09-24-plan-3-open-data-fuel-prices.md',
    },
    {
      title: { en: 'Build, test first', ms: 'Bina, uji dahulu' },
      text: {
        en: 'A fresh agent per task writes the failing test, then the code.',
        ms: 'Satu agent baharu bagi setiap tugasan menulis ujian yang gagal dahulu, kemudian kod.',
      },
    },
    {
      title: { en: 'Review every task', ms: 'Semak setiap tugasan' },
      text: {
        en: 'A separate reviewer checks each task against the plan. Findings are fixed in rounds, and every conflict gets a written ruling with its cost if wrong.',
        ms: 'Seorang reviewer berasingan menyemak setiap tugasan berdasarkan pelan. Penemuan dibetulkan dalam beberapa pusingan (rounds), dan setiap konflik mendapat ruling bertulis berserta kosnya jika ia tersilap.',
      },
    },
    {
      title: { en: 'Final review', ms: 'Semakan akhir' },
      text: {
        en: 'The strongest model reviews the whole branch; one fix wave; a scoped re-review.',
        ms: 'Model paling kukuh menyemak keseluruhan branch; satu fix wave; semakan semula yang berskop.',
      },
    },
    {
      title: { en: 'Verify for real', ms: 'Sahkan secara sebenar' },
      text: {
        en: 'The full check, a pass in a real browser, CI, then merge and deploy with my approval.',
        ms: 'Semakan penuh, ujian dalam pelayar sebenar, CI, kemudian merge dan deploy dengan kelulusan saya.',
      },
    },
  ],
  tools: [
    {
      name: { en: 'Claude Code', ms: 'Claude Code' },
      text: {
        en: 'The agent in my terminal.',
        ms: 'Agent dalam terminal saya.',
      },
    },
    {
      name: { en: 'Superpowers skills', ms: 'Superpowers skills' },
      text: {
        en: 'brainstorming, writing-plans, subagent-driven-development and finishing-a-development-branch: the process above, written as instructions the agent follows.',
        ms: 'brainstorming, writing-plans, subagent-driven-development dan finishing-a-development-branch: proses di atas, ditulis sebagai arahan yang diikuti oleh agent.',
      },
    },
    {
      name: { en: 'Data-visualisation skill', ms: 'Data-visualisation skill' },
      text: {
        en: 'Chart rules, and a palette validator for colour blindness and contrast in both themes.',
        ms: 'Peraturan carta, dan pengesah palet (palette validator) untuk buta warna dan kontras dalam kedua-dua tema.',
      },
    },
    {
      name: { en: 'Playwright MCP', ms: 'Playwright MCP' },
      text: {
        en: 'Drives real Chromium to check layout, focus and the live API.',
        ms: 'Menggerakkan Chromium sebenar untuk menyemak layout, focus dan API langsung.',
      },
    },
    {
      name: { en: 'GitHub and Vercel CLIs', ms: 'GitHub and Vercel CLIs' },
      text: {
        en: 'Pull requests, CI and deploys, always after my approval.',
        ms: 'Pull request, CI dan deploy, sentiasa selepas kelulusan saya.',
      },
    },
    {
      name: { en: 'Model tiers', ms: 'Model tiers' },
      text: {
        en: 'A fast model for transcription tasks, a standard one for most work, and the strongest for the chart, the final reviews and the fix waves.',
        ms: 'Model pantas untuk tugasan transkripsi, model standard untuk kebanyakan kerja, dan model paling kukuh untuk carta, semakan akhir dan fix wave.',
      },
    },
  ],
  ownership: {
    own: [
      { en: 'Requirements and scope', ms: 'Keperluan dan skop' },
      { en: 'Architecture and trade-offs', ms: 'Seni bina dan trade-off' },
      { en: 'Every ruling on a conflict', ms: 'Setiap ruling terhadap konflik' },
      { en: 'Approving what merges and deploys', ms: 'Meluluskan apa yang di-merge dan di-deploy' },
      { en: 'Accountability for the result', ms: 'Akauntabiliti terhadap hasil' },
    ],
    ai: [
      {
        en: 'Drafts code and tests from a written plan',
        ms: 'Merangka kod dan ujian daripada pelan bertulis',
      },
      {
        en: 'Reads library sources to confirm behaviour',
        ms: 'Membaca kod sumber library untuk mengesahkan gelagat',
      },
      { en: 'Reviews each task against the plan', ms: 'Menyemak setiap tugasan berdasarkan pelan' },
      { en: 'Checks the app in a real browser', ms: 'Menyemak aplikasi dalam pelayar sebenar' },
      { en: 'Runs the checks and the pipeline', ms: 'Menjalankan semakan dan pipeline' },
    ],
  },
  incidents: [
    {
      title: { en: 'A quiet API swap', ms: 'Pertukaran API senyap' },
      text: {
        en: 'A fast model replaced z.iso.datetime() with the deprecated z.string().datetime() without saying so. The task review caught it; the fix also switched on a lint rule for deprecated APIs.',
        ms: 'Model pantas menggantikan z.iso.datetime() dengan z.string().datetime() yang telah deprecated, tanpa menyatakannya. Semakan tugasan menangkapnya; pembetulan turut menghidupkan peraturan lint untuk API yang deprecated.',
      },
      links: [
        { kind: 'log', plan: 1 },
        { kind: 'commit', sha: 'f435834' },
      ],
    },
    {
      title: {
        en: 'A test passed by weakening the product',
        ms: 'Ujian lulus dengan melemahkan produk',
      },
      text: {
        en: "To make two tests pass, an agent turned off the review dialog's modal behaviour, removing the focus trap. I overruled it: the dialog stays modal, and the tests now assert that the page behind it is inert.",
        ms: 'Untuk melepaskan dua ujian, seorang agent mematikan gelagat modal dialog semakan, membuang focus trap. Saya membatalkan (overrule) keputusan itu: dialog kekal modal, dan ujian kini mengesahkan bahawa halaman di belakangnya adalah inert.',
      },
      links: [
        { kind: 'log', plan: 2 },
        { kind: 'commit', sha: '66e3cd7' },
      ],
    },
    {
      title: {
        en: 'My own plan, contradicting itself',
        ms: 'Pelan saya sendiri, bercanggah dengan dirinya',
      },
      text: {
        en: "The plan's code kept fuels in palette order, but its test expected URL order. The implementer resolved it the wrong way; the ruling restored the order and fixed the test.",
        ms: 'Kod dalam pelan mengekalkan susunan bahan api mengikut susunan palet, tetapi ujiannya menjangkakan susunan URL. Implementer menyelesaikannya dengan cara yang salah; ruling memulihkan susunan asal dan membetulkan ujian.',
      },
      links: [
        { kind: 'log', plan: 3 },
        { kind: 'commit', sha: '9dcbba0' },
      ],
    },
    {
      title: { en: 'A bug inside the design system', ms: 'Pepijat di dalam design system' },
      text: {
        en: 'The MYDS Select copied an uncontrolled open prop into state, which React reported as switching from controlled to uncontrolled. Found by reading the library source; fixed by controlling open ourselves, with a regression test.',
        ms: 'MYDS Select menyalin prop open yang uncontrolled ke dalam state, yang menyebabkan React melaporkan pertukaran daripada controlled kepada uncontrolled. Ditemui dengan membaca kod sumber library; dibetulkan dengan mengawal open kami sendiri, berserta ujian regresi.',
      },
      links: [
        { kind: 'log', plan: 1 },
        { kind: 'commit', sha: '16a386d' },
      ],
    },
    {
      title: {
        en: 'Framework behaviour, confirmed from the source',
        ms: 'Gelagat framework, disahkan daripada kod sumber',
      },
      text: {
        en: 'React Router 8 gives setSearchParams(fn) the parameters from the last render, not the last write, so two quick toggles lost one. A pending-write ref fixed it, with a test.',
        ms: 'React Router 8 memberikan setSearchParams(fn) parameter daripada render terakhir, bukan write terakhir, jadi dua toggle pantas menyebabkan satu hilang. Satu pending-write ref membetulkannya, berserta ujian.',
      },
      links: [
        { kind: 'log', plan: 3 },
        { kind: 'commit', sha: '8bfba78' },
      ],
    },
    {
      title: {
        en: 'What only a real browser shows',
        ms: 'Apa yang hanya pelayar sebenar tunjukkan',
      },
      text: {
        en: 'A clipped chart label, a tooltip off the edge of a phone screen, overlapping axis labels, and focus lost after closing the dialog: found by driving the app in Chromium, then fixed with tests.',
        ms: 'Label carta yang terpotong, tooltip yang keluar dari tepi skrin telefon, label axis yang bertindih, dan focus yang hilang selepas dialog ditutup: ditemui dengan menggerakkan aplikasi dalam Chromium, kemudian dibetulkan berserta ujian.',
      },
      links: [
        { kind: 'log', plan: 2 },
        { kind: 'log', plan: 3 },
      ],
    },
    {
      title: { en: 'A date parser that could throw', ms: 'Date parser yang boleh throw' },
      text: {
        en: "'2026-13-01 00:00' threw an error instead of failing validation, and '2026-02-30' quietly became 1 March. Both are now validation issues.",
        ms: "'2026-13-01 00:00' menyebabkan ralat (throw) bukannya gagal pengesahan, dan '2026-02-30' senyap-senyap bertukar menjadi 1 Mac. Kedua-duanya kini menjadi isu pengesahan (validation).",
      },
      links: [
        { kind: 'log', plan: 3 },
        { kind: 'commit', sha: 'c90b75e' },
      ],
    },
  ],
  numbers: {
    perPlan: [
      { plan: 1, tasks: 11, fixRounds: 2, rulings: 18 },
      { plan: 2, tasks: 10, fixRounds: 4, rulings: 11 },
      { plan: 3, tasks: 8, fixRounds: 4, rulings: 13 },
    ],
    total: { tasks: 29, fixRounds: 10, rulings: 42 },
  },
};
