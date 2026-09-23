import { z } from 'zod';

export type ApiErrorKind = 'network' | 'http' | 'validation' | 'conflict' | 'schema';

type ApiErrorInit = {
  kind: ApiErrorKind;
  message: string;
  status?: number | undefined;
  fieldErrors?: Record<string, string[]> | undefined;
  cause?: unknown;
};

const ErrorBodySchema = z.object({
  message: z.string().optional(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});

/** The only error type the data layer throws, so the UI can switch on `kind`. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | undefined;
  readonly fieldErrors: Record<string, string[]>;

  constructor({ kind, message, status, fieldErrors = {}, cause }: ApiErrorInit) {
    super(message, { cause });
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  static fromResponse(status: number, body: unknown): ApiError {
    const parsed = ErrorBodySchema.safeParse(body);
    const data = parsed.success ? parsed.data : undefined;
    return new ApiError({
      kind: kindForStatus(status),
      message: data?.message ?? `Request failed with status ${status}`,
      status,
      fieldErrors: data?.fieldErrors,
    });
  }
}

function kindForStatus(status: number): ApiErrorKind {
  if (status === 409) return 'conflict';
  if (status === 422) return 'validation';
  return 'http';
}
