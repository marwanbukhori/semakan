import { http, HttpResponse } from 'msw';
import { ApplicationListParamsSchema } from '@/features/applications/schemas';
import { getApplications, queryApplications } from '../db/applications';
import { getDevControls } from '../devControls';
import { simulateNetwork } from './simulate';

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
];
