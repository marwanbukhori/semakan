import { delay, HttpResponse } from 'msw';
import { getDevControls } from '../devControls';

/** Applies the Dev Panel's latency and failure settings. Returns a response only when the request should fail. */
export async function simulateNetwork(): Promise<Response | undefined> {
  const { latencyMs, failure } = getDevControls();
  if (latencyMs > 0) await delay(latencyMs);
  if (failure === 'server') {
    return HttpResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
  if (failure === 'network') return HttpResponse.error();
  return undefined;
}
