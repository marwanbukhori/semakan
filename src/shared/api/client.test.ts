import { http, HttpResponse } from 'msw';
import { z } from 'zod';
import { server } from '@/mocks/node';
import { ApiError } from './ApiError';
import { createApiClient } from './client';

const client = createApiClient({ baseUrl: '/api' });
const ThingSchema = z.object({ id: z.string(), count: z.number() });

describe('apiClient.get', () => {
  it('returns parsed data and sends only non-empty query params', async () => {
    let seenUrl = '';
    server.use(
      http.get('/api/things', ({ request }) => {
        seenUrl = request.url;
        return HttpResponse.json({ id: 'a', count: 1 });
      }),
    );

    const result = await client.get('/things', ThingSchema, {
      params: { page: 2, q: '', status: undefined, archived: null },
    });

    expect(result).toEqual({ id: 'a', count: 1 });
    expect(new URL(seenUrl).search).toBe('?page=2');
  });

  it('throws a schema ApiError when the response has the wrong shape', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    server.use(http.get('/api/things', () => HttpResponse.json({ id: 1 })));

    await expect(client.get('/things', ThingSchema)).rejects.toMatchObject({
      name: 'ApiError',
      kind: 'schema',
    });
  });

  it.each([
    [409, 'conflict'],
    [422, 'validation'],
    [404, 'http'],
    [500, 'http'],
  ] as const)('maps HTTP %i to kind "%s" with the server message', async (status, kind) => {
    server.use(
      http.get('/api/things', () =>
        HttpResponse.json({ message: 'nope', fieldErrors: { reason: ['Required'] } }, { status }),
      ),
    );

    const error = await client.get('/things', ThingSchema).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ kind, status, message: 'nope' });
  });

  it('keeps field errors from a 422 response', async () => {
    server.use(
      http.get('/api/things', () =>
        HttpResponse.json({ fieldErrors: { reason: ['Required'] } }, { status: 422 }),
      ),
    );

    const error = await client.get('/things', ThingSchema).catch((e: unknown) => e);

    expect(error).toMatchObject({
      kind: 'validation',
      message: 'Request failed with status 422',
      fieldErrors: { reason: ['Required'] },
    });
  });

  it('throws a network ApiError when the request cannot complete', async () => {
    server.use(http.get('/api/things', () => HttpResponse.error()));

    await expect(client.get('/things', ThingSchema)).rejects.toMatchObject({ kind: 'network' });
  });
});
