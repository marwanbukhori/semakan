import { rangeStart } from './ranges';

describe('rangeStart', () => {
  const now = new Date('2026-09-25T00:00:00.000Z');

  it('goes back by whole months', () => {
    expect(rangeStart('3m', now)).toBe('2026-06-25');
    expect(rangeStart('6m', now)).toBe('2026-03-25');
    expect(rangeStart('1y', now)).toBe('2025-09-25');
  });
});
