import { delay, http, HttpResponse, passthrough } from 'msw';
import { z } from 'zod';
import { assertNever } from '@/shared/lib/assertNever';
import fixture from '../fixtures/fuelprice.json';
import { getDevControls } from '../devControls';

export const DATA_GOV_CATALOGUE_URL = 'https://api.data.gov.my/data-catalogue/';

const RecordingSchema = z.object({
  meta: z.record(z.string(), z.unknown()),
  data: z.array(z.object({ date: z.string() }).loose()),
});
const recording = RecordingSchema.parse(fixture);

/** "2026-08-01@date" -> "2026-08-01" */
const dateParam = (url: URL, name: string) => url.searchParams.get(name)?.split('@')[0];

function recordedResponse(url: URL) {
  const start = dateParam(url, 'date_start') ?? '0000-01-01';
  const end = dateParam(url, 'date_end') ?? '9999-12-31';
  const data = recording.data.filter((row) => row.date >= start && row.date <= end);
  return { meta: { ...recording.meta, total: data.length }, data };
}

const notFound = (id: string) =>
  HttpResponse.json(
    { status_code: 404, details: [`The data catalogue (${id}) requested does not exist.`] },
    { status: 404 },
  );

export const dataGovHandlers = [
  http.get(DATA_GOV_CATALOGUE_URL, async ({ request }) => {
    const { dataGov, latencyMs } = getDevControls();
    // Live: the real request goes out; the browser's Network tab shows the real API.
    if (dataGov === 'live') return passthrough();

    if (latencyMs > 0) await delay(latencyMs);
    const url = new URL(request.url);
    const id = url.searchParams.get('id') ?? '';

    switch (dataGov) {
      case 'fixture':
        return id === 'fuelprice' ? HttpResponse.json(recordedResponse(url)) : notFound(id);
      case 'rate_limited':
        return HttpResponse.json(
          { status_code: 429, details: ['Too many requests'] },
          { status: 429 },
        );
      case 'not_found':
        return notFound(id);
      case 'offline':
        return HttpResponse.error();
      default:
        return assertNever(dataGov);
    }
  }),
];
