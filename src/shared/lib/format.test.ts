import { formatDate, formatDateTime } from './format';

describe('formatDate', () => {
  it('formats in Malaysian time', () => {
    expect(formatDate('2026-09-20T09:00:00.000Z', 'en')).toMatch(/20 Sep/);
  });

  it('rolls over to the next day after midnight in Malaysia', () => {
    // 17:00 UTC is 01:00 the next day in Kuala Lumpur.
    expect(formatDate('2026-09-20T17:00:00.000Z', 'en')).toMatch(/21 Sep/);
  });

  it('formats in Malay', () => {
    expect(formatDate('2026-09-20T09:00:00.000Z', 'ms')).toMatch(/20 Sep/);
  });
});

describe('formatDateTime', () => {
  it('shows date and time in Malaysian time', () => {
    const text = formatDateTime('2026-09-20T17:05:00.000Z', 'en');
    expect(text).toMatch(/21 Sep/);
    expect(text).toMatch(/1:05/);
  });
});
