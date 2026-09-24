import type { PipeTransform } from '@nestjs/common';
import type { z } from 'zod';
import { ProblemException } from './problem.filter';

/**
 * Groups zod issues by field, like `toFieldErrors` in the web app's mock
 * (apps/web/src/mocks/handlers/applications.ts): the `review` prefix is
 * stripped and the key is the first remaining path segment. The messages are
 * already error codes such as `reason_too_short`.
 */
export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path[0] === 'review' ? issue.path.slice(1) : issue.path;
    // Key by the field itself: `requestedInfo.0` belongs to `requestedInfo`.
    const key = String(path[0] ?? 'root');
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

/** Validates with a zod schema and answers 422 in the same shape as the mock. */
export class ZodValidationPipe<S extends z.ZodType> implements PipeTransform {
  constructor(
    private readonly schema: S,
    private readonly title: string,
  ) {}

  transform(value: unknown): z.output<S> {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      throw new ProblemException(422, {
        title: this.title,
        fieldErrors: toFieldErrors(parsed.error),
      });
    }
    return parsed.data;
  }
}
