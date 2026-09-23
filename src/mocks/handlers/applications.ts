import { http, HttpResponse } from 'msw';
import type { z } from 'zod';
import { ApplicationListParamsSchema, ReviewRequestSchema } from '@/features/applications/schemas';
import { assertNever } from '@/shared/lib/assertNever';
import {
  applyReview,
  getApplication,
  getApplications,
  queryApplications,
} from '../db/applications';
import { getDevControls, setDevControls } from '../devControls';
import { simulateNetwork } from './simulate';

/** zod issues -> { field: [code] }, with paths relative to `review` (the form's field names). */
function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path[0] === 'review' ? issue.path.slice(1) : issue.path;
    const key = path.join('.') || 'root';
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

export const applicationHandlers = [
  http.get('/api/applications', async ({ request }) => {
    const failure = await simulateNetwork();
    if (failure) return failure;

    const params = ApplicationListParamsSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const source = getDevControls().emptyList ? [] : getApplications();
    return HttpResponse.json(queryApplications(source, params));
  }),

  http.get('/api/applications/:id', async ({ params }) => {
    const failure = await simulateNetwork();
    if (failure) return failure;

    const detail = getApplication(String(params.id));
    if (!detail) return HttpResponse.json({ message: 'Application not found' }, { status: 404 });
    return HttpResponse.json(detail);
  }),

  http.post('/api/applications/:id/review', async ({ params, request }) => {
    const failure = await simulateNetwork();
    if (failure) return failure;

    if (getDevControls().conflictNext) {
      setDevControls({ conflictNext: false });
      return HttpResponse.json({ message: 'Updated by another officer' }, { status: 409 });
    }

    const body: unknown = await request.json();
    const parsed = ReviewRequestSchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json(
        { message: 'Invalid review', fieldErrors: toFieldErrors(parsed.error) },
        { status: 422 },
      );
    }

    const outcome = applyReview(String(params.id), parsed.data);
    switch (outcome.kind) {
      case 'ok':
        return HttpResponse.json(outcome.detail);
      case 'not_found':
        return HttpResponse.json({ message: 'Application not found' }, { status: 404 });
      case 'conflict':
        return HttpResponse.json({ message: 'Updated by another officer' }, { status: 409 });
      case 'invalid':
        return HttpResponse.json(
          { message: 'Review rejected', fieldErrors: outcome.fieldErrors },
          { status: 422 },
        );
      default:
        return assertNever(outcome);
    }
  }),
];
