export const en = {
  app: {
    name: 'Semakan',
    tagline: 'Licence application review',
    skipToContent: 'Skip to main content',
    nav: { label: 'Main', applications: 'Applications' },
    theme: { light: 'Light theme', dark: 'Dark theme' },
  },
  applications: {
    title: 'Licence applications',
    loading: 'Loading applications…',
    resultCount_one: '{{count}} application',
    resultCount_other: '{{count}} applications',
    columns: {
      referenceNo: 'Reference',
      businessName: 'Business',
      applicantName: 'Applicant',
      premisesCategory: 'Category',
      submittedAt: 'Submitted',
      status: 'Status',
    },
    empty: {
      title: 'No applications found',
      filtered: 'Nothing matches these filters.',
      unfiltered: 'There are no applications yet.',
      clear: 'Clear filters',
    },
    filters: {
      search: 'Search',
      searchPlaceholder: 'Reference, applicant or business',
      status: 'Status',
      allStatuses: 'All statuses',
    },
    pagination: { label: 'Pages of results', previous: 'Previous', next: 'Next' },
  },
  status: {
    submitted: 'Submitted',
    under_review: 'Under review',
    info_requested: 'Info requested',
    approved: 'Approved',
    rejected: 'Rejected',
  },
  category: {
    food_beverage: 'Food & beverage',
    retail: 'Retail',
    services: 'Services',
    workshop: 'Workshop',
    entertainment: 'Entertainment',
  },
  errors: {
    title: "Couldn't load applications",
    network: 'Check your connection and try again.',
    server: 'The server had a problem. Try again in a moment.',
    schema: 'The server sent data we did not expect. The team has been notified.',
    retry: 'Try again',
    route: {
      title: 'Something went wrong',
      body: 'This page failed to load.',
      home: 'Back to applications',
    },
    notFound: { title: 'Page not found', body: 'There is nothing at this address.' },
  },
  devPanel: {
    toggle: 'Dev Panel',
    title: 'Mock API controls',
    latency: 'Latency',
    latencyNone: 'None',
    failure: 'Failure',
    failureNone: 'None',
    failureServer: 'Server error (500)',
    failureNetwork: 'Network failure',
    emptyList: 'Return an empty list',
    reset: 'Reset demo data',
  },
} as const;

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };

/** Every language must provide exactly these keys; the type checker enforces it. */
export type Translation = Widen<typeof en>;
