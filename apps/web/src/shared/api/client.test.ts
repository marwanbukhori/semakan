import { delay, http, HttpResponse } from 'msw';
import { z } from 'zod';
import { server } from '@/mocks/node';
import { ApiError } from './ApiError';
import { apiClient, createApiClient, setApiBaseUrl } from './client';

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

  it('passes cancellation through as the original AbortError, not an ApiError', async () => {
    server.use(
      http.get('/api/things', async () => {
        await delay('infinite');
        return HttpResponse.json({ id: 'a', count: 1 });
      }),
    );
    const controller = new AbortController();

    const pending = client.get('/things', ThingSchema, { signal: controller.signal });
    controller.abort();
    const error = await pending.catch((e: unknown) => e);

    expect(error).not.toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ name: 'AbortError' });
  });
});

describe('apiClient.post', () => {
  it('sends a JSON body and returns the parsed response', async () => {
    let seen: { method: string; contentType: string | null; body: unknown } | undefined;
    server.use(
      http.post('/api/things', async ({ request }) => {
        seen = {
          method: request.method,
          contentType: request.headers.get('Content-Type'),
          body: await request.json(),
        };
        return HttpResponse.json({ id: 'b', count: 2 });
      }),
    );

    const result = await client.post('/things', ThingSchema, { name: 'x' });

    expect(result).toEqual({ id: 'b', count: 2 });
    expect(seen).toEqual({
      method: 'POST',
      contentType: 'application/json',
      body: { name: 'x' },
    });
  });

  it('maps a 422 response to a validation ApiError with field error codes', async () => {
    server.use(
      http.post('/api/things', () =>
        HttpResponse.json({ fieldErrors: { reason: ['reason_too_short'] } }, { status: 422 }),
      ),
    );

    const error = await client.post('/things', ThingSchema, {}).catch((e: unknown) => e);

    expect(error).toMatchObject({
      kind: 'validation',
      status: 422,
      fieldErrors: { reason: ['reason_too_short'] },
    });
  });
});

describe('createApiClient with a baseUrl function', () => {
  it('resolves the base URL on every request and sends custom headers', async () => {
    let seenHeader: string | null = null;
    server.use(
      http.get('/x/things', ({ request }) => {
        seenHeader = request.headers.get('X-Test');
        return HttpResponse.json({ id: 'a', count: 1 });
      }),
    );
    const dynamicClient = createApiClient({ baseUrl: () => '/x' });

    const result = await dynamicClient.get('/things', ThingSchema, {
      headers: { 'X-Test': 'abc' },
    });

    expect(result).toEqual({ id: 'a', count: 1 });
    expect(seenHeader).toBe('abc');
  });
});

describe('setApiBaseUrl', () => {
  afterEach(() => setApiBaseUrl('/api'));

  it('repoints the shared apiClient at the given base URL', async () => {
    let seenUrl = '';
    server.use(
      http.get('/api/v1/things', ({ request }) => {
        seenUrl = request.url;
        return HttpResponse.json({ id: 'a', count: 1 });
      }),
    );

    setApiBaseUrl('/api/v1');
    const result = await apiClient.get('/things', ThingSchema);

    expect(result).toEqual({ id: 'a', count: 1 });
    expect(new URL(seenUrl).pathname).toBe('/api/v1/things');
  });
});
