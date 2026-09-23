export const aboutKeys = {
  all: ['about'] as const,
  source: (path: string) => [...aboutKeys.all, 'source', path] as const,
};
