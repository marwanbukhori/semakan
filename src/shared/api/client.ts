import { z } from 'zod';
import { ApiError } from './ApiError';

type QueryValue = string | number | boolean | null | undefined;

export type RequestOptions = {
  params?: Record<string, QueryValue>;
  signal?: AbortSignal;
};

export function createApiClient({ baseUrl }: { baseUrl: string }) {
  /** GET a resource and validate it. The schema is required: unvalidated data never reaches the UI. */
  async function get<T extends z.ZodType>(
    path: string,
    schema: T,
    options: RequestOptions = {},
  ): Promise<z.infer<T>> {
    const response = await send(buildUrl(baseUrl, path, options.params), options.signal);
    const body = await readJson(response);

    if (!response.ok) throw ApiError.fromResponse(response.status, body);

    const result = schema.safeParse(body);
    if (!result.success) {
      console.error(
        `[api] ${path} returned an unexpected shape:\n${z.prettifyError(result.error)}`,
      );
      throw new ApiError({
        kind: 'schema',
        message: 'Response did not match the expected schema',
        status: response.status,
        cause: result.error,
      });
    }
    return result.data;
  }

  return { get };
}

export type ApiClient = ReturnType<typeof createApiClient>;

export const apiClient = createApiClient({ baseUrl: '/api' });

function buildUrl(baseUrl: string, path: string, params: RequestOptions['params'] = {}): URL {
  const url = new URL(`${baseUrl}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }
  return url;
}

async function send(url: URL, signal: AbortSignal | undefined): Promise<Response> {
  try {
    return await fetch(url, { signal, headers: { Accept: 'application/json' } });
  } catch (cause) {
    // Cancellation is not a failure: let TanStack Query see the original AbortError.
    if (signal?.aborted && cause instanceof Error) throw cause;
    throw new ApiError({ kind: 'network', message: 'Network request failed', cause });
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text === '') return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
