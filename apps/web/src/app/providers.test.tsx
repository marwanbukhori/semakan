import { useQuery } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { ApplicationListSchema } from '@/features/applications/schemas';
import { resetDevControls, setDevControls } from '@/mocks/devControls';
import { server } from '@/mocks/node';
import { apiClient, setApiBaseUrl } from '@/shared/api/client';
import { AppProviders } from './providers';

const emptyList = { items: [], page: 1, pageSize: 10, total: 0 };

/** A cheap query so the test only cares which base URL it was sent to. */
function Probe() {
  const { data } = useQuery({
    queryKey: ['probe-applications'],
    queryFn: () => apiClient.get('/applications', ApplicationListSchema),
  });
  return <div>{data ? 'loaded' : 'loading'}</div>;
}

describe('useApiSource (AppProviders)', () => {
  afterEach(() => {
    resetDevControls();
    setApiBaseUrl('/api');
  });

  it('switches between the mock and real base URL as the Dev Panel API source changes', async () => {
    const hits: string[] = [];
    server.use(
      http.get('/api/applications', () => {
        hits.push('mock');
        return HttpResponse.json(emptyList);
      }),
      http.get('/api/v1/applications', () => {
        hits.push('real');
        return HttpResponse.json(emptyList);
      }),
    );

    render(
      <AppProviders>
        <Probe />
      </AppProviders>,
    );

    await waitFor(() => expect(screen.getByText('loaded')).toBeInTheDocument());
    expect(hits).toEqual(['mock']);

    // Switching source clears the query cache, so the still-mounted query refetches.
    act(() => setDevControls({ apiSource: 'real' }));
    await waitFor(() => expect(hits).toEqual(['mock', 'real']));

    act(() => setDevControls({ apiSource: 'mock' }));
    await waitFor(() => expect(hits).toEqual(['mock', 'real', 'mock']));
  });
});
