import { screen } from '@testing-library/react';
import { renderRoutes } from '@/test/render';
import { useFuelFilters } from './useFuelFilters';

function Probe() {
  const { range, fuels, setRange, toggleFuel } = useFuelFilters();
  return (
    <>
      <output aria-label="filters">{JSON.stringify({ range, fuels })}</output>
      <button onClick={() => setRange('1y')}>1y</button>
      <button onClick={() => toggleFuel('ron97')}>toggle ron97</button>
      <button
        onClick={() => {
          toggleFuel('ron97');
          toggleFuel('diesel');
        }}
      >
        toggle ron97 and diesel
      </button>
    </>
  );
}

const renderProbe = (url = '/') =>
  renderRoutes([{ path: '/', Component: Probe }], { initialEntries: [url] });
const state = () =>
  JSON.parse(screen.getByRole('status', { name: 'filters' }).textContent ?? '') as unknown;

describe('useFuelFilters', () => {
  it('defaults to six months and every fuel, with a clean URL', () => {
    const { router } = renderProbe();
    expect(state()).toEqual({ range: '6m', fuels: ['ron95', 'ron97', 'diesel', 'ron95_budi95'] });
    expect(router.state.location.search).toBe('');
  });

  it('writes the range and fuel toggles to the URL, keeping palette order', async () => {
    const { user, router } = renderProbe('/?fuels=diesel');
    await user.click(screen.getByRole('button', { name: 'toggle ron97' }));
    await user.click(screen.getByRole('button', { name: '1y' }));

    expect(state()).toEqual({ range: '1y', fuels: ['ron97', 'diesel'] });
    expect(new URLSearchParams(router.state.location.search).get('fuels')).toBe('ron97,diesel');
  });

  it('removes a fuel that is already shown', async () => {
    const { user } = renderProbe();
    await user.click(screen.getByRole('button', { name: 'toggle ron97' }));
    expect(state()).toMatchObject({ fuels: ['ron95', 'diesel', 'ron95_budi95'] });
  });

  it('applies two toggles made in the same tick', async () => {
    const { user, router } = renderProbe();
    await user.click(screen.getByRole('button', { name: 'toggle ron97 and diesel' }));
    expect(state()).toMatchObject({ fuels: ['ron95', 'ron95_budi95'] });
    expect(new URLSearchParams(router.state.location.search).get('fuels')).toBe(
      'ron95,ron95_budi95',
    );
  });
});
