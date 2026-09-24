import { z } from 'zod';

const ConfigSchema = z.object({
  DATABASE_URL: z.url(),
  PORT: z.coerce.number().int().positive().default(3100),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  /** The officer every review is recorded against. Plan 6c replaces it with the authenticated user. */
  DEMO_OFFICER: z.string().trim().min(1).default('Pn. Hafizah'),
});

export type Config = z.infer<typeof ConfigSchema>;

/** Parses the environment once at startup; throws, so the app refuses to boot, when it is invalid. */
export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const parsed = ConfigSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
