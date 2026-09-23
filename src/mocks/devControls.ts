import { z } from 'zod';

const DevControlsSchema = z.object({
  latencyMs: z.union([z.literal(0), z.literal(800), z.literal(2000)]),
  failure: z.enum(['none', 'server', 'network']),
  emptyList: z.boolean(),
});

export type DevControls = z.infer<typeof DevControlsSchema>;

export const LATENCY_OPTIONS = [
  0, 800, 2000,
] as const satisfies readonly DevControls['latencyMs'][];
export const FAILURE_OPTIONS = [
  'none',
  'server',
  'network',
] as const satisfies readonly DevControls['failure'][];
export const DEFAULT_DEV_CONTROLS: DevControls = {
  latencyMs: 0,
  failure: 'none',
  emptyList: false,
};

const STORAGE_KEY = 'semakan.devControls';
const listeners = new Set<() => void>();
let current = load();

function load(): DevControls {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_DEV_CONTROLS;
    const parsed = DevControlsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_DEV_CONTROLS;
  } catch {
    return DEFAULT_DEV_CONTROLS;
  }
}

function save(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Storage unavailable (private mode): keep the settings in memory only.
  }
}

export function getDevControls(): DevControls {
  return current;
}

export function setDevControls(patch: Partial<DevControls>): void {
  current = { ...current, ...patch };
  save();
  listeners.forEach((listener) => listener());
}

export function resetDevControls(): void {
  setDevControls(DEFAULT_DEV_CONTROLS);
}

/** For useSyncExternalStore. */
export function subscribeDevControls(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
