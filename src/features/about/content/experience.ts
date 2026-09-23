import type { Localized } from '../localized';
import type { RequirementId } from './requirements';

/** `href` is an app route (not a repo path) for every entry currently in `PROJECTS`. */
export type ProjectLink = { label: Localized<string>; href: string };

/** `requirements` are ids, not language-specific, so only prose is `Localized`. */
export type Facet = {
  built: Localized<string[]>;
  challenge?: Localized<string>;
  semakan?: ProjectLink[];
  requirements: RequirementId[];
};

/** `id`, `period` and `stack` are not language-specific, so only `name`/`org` and each facet's prose are `Localized`. */
export type Project = {
  id: string;
  name: Localized<string>;
  org: Localized<string>;
  period: string;
  stack: string[];
  frontend?: Facet;
  backend?: Facet;
};

export const PROJECTS: readonly Project[] = [
  {
    id: 'eis',
    name: { en: 'E-Invoice System (EIS)', ms: 'E-Invoice System (EIS)' },
    org: { en: 'Silentmode Sdn. Bhd.', ms: 'Silentmode Sdn. Bhd.' },
    period: 'Aug 2024 – Feb 2026',
    stack: ['Vue', 'PrimeVue', 'NestJS', 'AWS SQS', 'ECS', 'Lambda', 'DynamoDB'],
    frontend: {
      built: {
        en: ['The entire frontend, in Vue with the PrimeVue component library.'],
        ms: ['Keseluruhan frontend, dalam Vue dengan component library PrimeVue.'],
      },
      semakan: [
        {
          label: {
            en: 'Async states you can force live',
            ms: 'Async states yang boleh dipaksa secara langsung',
          },
          href: '/applications',
        },
      ],
      requirements: ['fe-production', 'fe-ts-react', 'fe-api-states', 'fe-design-system'],
    },
    backend: {
      built: {
        en: [
          'Built from scratch for RONPOS: an e-invoicing system for fuel retail and end users.',
          'Event-driven on AWS: SQS, ECS, Lambda and DynamoDB, with CQRS and domain-driven design.',
          'The e-invoice submission module, from creation to LHDN API integration, using message-queue patterns.',
          'Support tickets, hotfixes and production deployments for Hub and EIS.',
        ],
        ms: [
          'Dibina dari awal untuk RONPOS: sistem e-invois untuk peruncitan bahan api dan pengguna akhir.',
          'Event-driven di atas AWS: SQS, ECS, Lambda dan DynamoDB, dengan CQRS dan domain-driven design.',
          'Modul penghantaran e-invois, dari penciptaan hingga integrasi API LHDN, menggunakan corak message-queue.',
          'Tiket sokongan, hotfix dan production deployment untuk Hub dan EIS.',
        ],
      },
      challenge: {
        en: 'Submissions to LHDN travel through a queue, so the system is built from events rather than request and response.',
        ms: 'Penghantaran ke LHDN melalui queue, jadi sistem ini dibina berdasarkan events dan bukan request-response.',
      },
      requirements: [
        'be-typed-services',
        'be-event-driven',
        'be-microservices',
        'be-ddd',
        'be-cloud',
        'be-oncall',
        'be-api-design',
      ],
    },
  },
  {
    id: 'verus-virtus-site',
    name: { en: 'Verus Virtus company site', ms: 'Laman syarikat Verus Virtus' },
    org: { en: 'Verus Virtus Sdn. Bhd.', ms: 'Verus Virtus Sdn. Bhd.' },
    period: 'May – Aug 2026',
    stack: ['Next.js', 'React', 'Tailwind CSS', 'Vercel'],
    frontend: {
      built: {
        en: [
          "Designed and built the public site as the company's first software engineer.",
          'One page with anchored sections, so the whole pitch reads in a single scroll and any part can be linked.',
          'Motion in CSS only: no animation library, a fast page and a short dependency list.',
        ],
        ms: [
          'Mereka bentuk dan membina laman awam sebagai jurutera perisian pertama syarikat.',
          'Satu halaman dengan seksyen berlabuh (anchored), supaya keseluruhan pitch dibaca dalam satu scroll dan mana-mana bahagian boleh dipautkan.',
          'Motion dalam CSS sahaja: tiada animation library, halaman yang pantas dan senarai dependency yang pendek.',
        ],
      },
      challenge: {
        en: 'Most of the client work is under NDA, so the site has to build credibility without showing the work.',
        ms: 'Kebanyakan kerja client adalah di bawah NDA, jadi laman ini perlu membina kredibiliti tanpa menunjukkan kerja sebenar.',
      },
      semakan: [
        {
          label: {
            en: 'Route and vendor code splitting',
            ms: 'Code splitting mengikut route dan vendor',
          },
          href: '/about/practices',
        },
      ],
      requirements: [
        'fe-production',
        'fe-ts-react',
        'fe-responsive',
        'fe-performance',
        'fe-product',
      ],
    },
  },
  {
    id: 'rembayung',
    name: { en: 'Rembayung booking queue', ms: 'Queue tempahan Rembayung' },
    org: { en: 'Personal project', ms: 'Projek peribadi' },
    period: '2026',
    stack: [
      'Angular',
      'Java',
      'Spring Boot',
      'Oracle',
      'Redis',
      'OpenShift',
      'Ansible',
      'GitHub Actions',
      'k6',
      'Splunk',
      'Dynatrace',
    ],
    frontend: {
      built: {
        en: [
          'An Angular console that reads the drop, pods, quota and autoscalers live, and can start a load run itself.',
        ],
        ms: [
          'Konsol Angular yang membaca drop, pods, quota dan autoscaler secara langsung, dan boleh memulakan load run sendiri.',
        ],
      },
      semakan: [
        {
          label: {
            en: 'Failure modes you can simulate',
            ms: 'Mod kegagalan yang boleh disimulasikan',
          },
          href: '/about/architecture',
        },
      ],
      requirements: ['fe-ts-react', 'fe-api-states', 'fe-observability'],
    },
    backend: {
      built: {
        en: [
          'A queue gate that admits arrivals at a fixed rate, so the crowd is metered before it reaches the database.',
          'Bookings take a pessimistic row lock per slot, and an Oracle CHECK constraint makes overselling impossible.',
          'Load is shed with deliberate 503s instead of collapsing; k6 runs inside the cluster under the same quota.',
          'Ansible deploys with automatic rollback; Splunk for logs and Dynatrace for traces.',
          '203 tests across three services, run against a real Oracle database in Testcontainers.',
        ],
        ms: [
          'Queue gate yang membenarkan kemasukan pada kadar tetap, supaya kesesakan dikawal (metered) sebelum sampai ke database.',
          'Setiap tempahan mengambil pessimistic row lock bagi setiap slot, dan Oracle CHECK constraint menjadikan overselling mustahil.',
          'Load dilepaskan (shed) dengan 503 secara sengaja dan bukannya collapse; k6 berjalan di dalam cluster di bawah quota yang sama.',
          'Ansible deploy dengan automatic rollback; Splunk untuk logs dan Dynatrace untuk traces.',
          '203 tests merentasi tiga servis, dijalankan terhadap database Oracle sebenar dalam Testcontainers.',
        ],
      },
      challenge: {
        en: 'A booking night that crashed at around three thousand attempts and sold the same table twice: two different failures with two different fixes.',
        ms: 'Satu malam tempahan yang crash pada kira-kira tiga ribu percubaan dan menjual meja yang sama dua kali: dua kegagalan berbeza dengan dua penyelesaian berbeza.',
      },
      requirements: [
        'be-typed-services',
        'be-database',
        'be-performance',
        'be-testing',
        'be-observability',
        'be-cloud',
        'be-cicd',
        'be-microservices',
      ],
    },
  },
  {
    id: 'cloudbos',
    name: { en: 'CloudBOS reporting', ms: 'Pelaporan CloudBOS' },
    org: {
      en: 'Terato Tech (outsourced to Silentmode)',
      ms: 'Terato Tech (disumber luar kepada Silentmode)',
    },
    period: 'Feb 2023 – Aug 2024',
    stack: ['Laravel', 'Vue'],
    frontend: {
      built: {
        en: [
          'Vue components inside a Laravel monolith for reporting features used at fuel stations.',
        ],
        ms: [
          'Component Vue di dalam monolith Laravel untuk ciri reporting yang digunakan di stesen bahan api.',
        ],
      },
      semakan: [
        {
          label: {
            en: 'Tables that scroll on small screens',
            ms: 'Jadual yang scroll pada skrin kecil',
          },
          href: '/open-data/fuel-prices',
        },
      ],
      requirements: ['fe-production', 'fe-ts-react'],
    },
    backend: {
      built: {
        en: [
          'Reporting features such as fuel totalizer and sales movement reports, used across 1,000+ Petronas, Shell and BHPetrol stations.',
          'An Electronic Shelf Label system with dynamic PDF and Excel generation.',
          'Planogram generation with adjustable width, height and user-defined parameters.',
        ],
        ms: [
          'Ciri reporting seperti laporan fuel totalizer dan sales movement, digunakan merentasi 1,000+ stesen Petronas, Shell dan BHPetrol.',
          'Sistem Electronic Shelf Label dengan penjanaan PDF dan Excel secara dinamik.',
          'Penjanaan planogram dengan lebar, tinggi dan parameter yang ditentukan pengguna, boleh dilaraskan.',
        ],
      },
      requirements: ['be-api-design', 'be-database'],
    },
  },
  {
    id: 'ron95',
    name: { en: 'RON95 subsidy and POS features', ms: 'Ciri subsidi RON95 dan POS' },
    org: { en: 'Silentmode Sdn. Bhd.', ms: 'Silentmode Sdn. Bhd.' },
    period: 'Aug 2024 – Feb 2026',
    stack: ['NestJS', 'TypeScript', 'MongoDB', 'Jest', 'Docker'],
    backend: {
      built: {
        en: [
          'RON95 subsidy transactions and payment processing for a POS system, integrated with the CDB team.',
          'About 800,000 subsidy transactions a day across fuel stations nationwide.',
          'Domain-driven design and test-driven development with Jest.',
          'Virtual loyalty points in the receipt module, and MyDebit card support with the Invenco team.',
        ],
        ms: [
          'Transaksi subsidi RON95 dan pemprosesan pembayaran untuk sistem POS, disepadukan dengan pasukan CDB.',
          'Kira-kira 800,000 transaksi subsidi sehari merentasi stesen bahan api di seluruh negara.',
          'Domain-driven design dan test-driven development dengan Jest.',
          'Mata ganjaran maya (virtual loyalty points) dalam modul resit, dan sokongan kad MyDebit bersama pasukan Invenco.',
        ],
      },
      challenge: {
        en: 'A nationwide subsidy flow where every transaction has to be right, at a scale of hundreds of thousands a day.',
        ms: 'Aliran subsidi seluruh negara di mana setiap transaksi mesti tepat, pada skala ratusan ribu sehari.',
      },
      semakan: [
        {
          label: {
            en: 'The BUDI95 price on the fuel chart',
            ms: 'Harga BUDI95 pada carta bahan api',
          },
          href: '/open-data/fuel-prices',
        },
      ],
      requirements: [
        'be-typed-services',
        'be-ddd',
        'be-testing',
        'be-quality',
        'be-performance',
        'be-oncall',
      ],
    },
  },
  {
    id: 'geomotion',
    name: { en: 'Security hardening', ms: 'Pengukuhan keselamatan' },
    org: { en: 'Geomotion (Malaysia) Sdn. Bhd.', ms: 'Geomotion (Malaysia) Sdn. Bhd.' },
    period: 'Feb – Apr 2026',
    stack: ['GitLab CI', 'Grype', 'GitLab SAST', 'pip-audit'],
    backend: {
      built: {
        en: [
          'Security hardening across six microservice repositories after audit findings: API rate limiting, WAF rules and stronger HTTP security headers.',
          'Content Security Policy and Subresource Integrity for the web applications.',
          'Automated scanning in every CI/CD stage: Grype, GitLab SAST and pip-audit.',
        ],
        ms: [
          'Security hardening merentasi enam repositori microservice selepas dapatan audit: API rate limiting, peraturan WAF dan HTTP security headers yang lebih kukuh.',
          'Content Security Policy dan Subresource Integrity untuk aplikasi web.',
          'Scanning automated pada setiap peringkat CI/CD: Grype, GitLab SAST dan pip-audit.',
        ],
      },
      requirements: ['be-security', 'be-cicd', 'be-microservices'],
    },
  },
  {
    id: 'python',
    name: { en: 'Python services', ms: 'Servis Python' },
    org: { en: 'Personal projects', ms: 'Projek peribadi' },
    period: '2026',
    stack: ['Python', 'LangGraph', 'LangChain', 'FastMCP', 'Ollama', 'Docker'],
    backend: {
      built: {
        en: [
          'A retrieval service over my resume: a LangGraph graph behind a FastMCP server and a plain POST /api/chat endpoint.',
          'A local recipe agent with tool calling and a separate vision step, running on local models.',
        ],
        ms: [
          'Servis retrieval di atas resume saya: graph LangGraph di sebalik server FastMCP dan endpoint POST /api/chat yang ringkas.',
          'Ejen resipi tempatan dengan tool calling dan langkah vision berasingan, berjalan atas model tempatan.',
        ],
      },
      requirements: ['be-typed-services', 'be-api-design'],
    },
  },
];
