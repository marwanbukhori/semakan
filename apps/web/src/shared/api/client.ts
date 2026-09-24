import { z } from 'zod';
import { ApiError } from './ApiError';

type QueryValue = string | number | boolean | null | undefined;

export type RequestOptions = {
  params?: Record<string, QueryValue>;
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

type SendOptions = RequestOptions & { method: 'GET' | 'POST'; body?: unknown };

export function createApiClient({ baseUrl }: { baseUrl: string | (() => string) }) {
  function resolveBaseUrl(): string {
    return typeof baseUrl === 'string' ? baseUrl : baseUrl();
  }

  // #region practice:validate-at-boundary
  /** Every request is validated: the schema is required, so unvalidated data never reaches the UI. */
  async function request<T extends z.ZodType>(
    path: string,
    schema: T,
    { method, body, params, signal, headers }: SendOptions,
  ): Promise<z.infer<T>> {
    const response = await send(buildUrl(resolveBaseUrl(), path, params), {
      method,
      body,
      signal,
      headers,
    });
    const payload = await readJson(response);

    if (!response.ok) throw ApiError.fromResponse(response.status, payload);

    const result = schema.safeParse(payload);
    if (!result.success) {
      console.error(
        `[api] ${method} ${path} returned an unexpected shape:\n${z.prettifyError(result.error)}`,
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
  // #endregion

  function get<T extends z.ZodType>(
    path: string,
    schema: T,
    options: RequestOptions = {},
  ): Promise<z.infer<T>> {
    return request(path, schema, { ...options, method: 'GET' });
  }

  function post<T extends z.ZodType>(
    path: string,
    schema: T,
    body: unknown,
    options: RequestOptions = {},
  ): Promise<z.infer<T>> {
    return request(path, schema, { ...options, method: 'POST', body });
  }

  return { get, post };
}

export type ApiClient = ReturnType<typeof createApiClient>;

// The app layer (never shared code) may repoint this at the real API in dev; see setApiBaseUrl.
let currentBase = '/api';

/** Set by the app layer, e.g. when the Dev Panel's API source switch changes. */
export function setApiBaseUrl(url: string): void {
  currentBase = url;
}

export const apiClient = createApiClient({ baseUrl: () => currentBase });

function buildUrl(baseUrl: string, path: string, params: RequestOptions['params'] = {}): URL {
  const url = new URL(`${baseUrl}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }
  return url;
}

async function send(
  url: URL,
  { method, body, signal, headers }: Pick<SendOptions, 'method' | 'body' | 'signal' | 'headers'>,
): Promise<Response> {
  const hasBody = body !== undefined;
  try {
    return await fetch(url, {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: hasBody ? JSON.stringify(body) : undefined,
    });
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
