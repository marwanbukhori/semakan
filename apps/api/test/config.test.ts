import { loadConfig } from '../src/config';

describe('loadConfig', () => {
  it('applies defaults', () => {
    expect(loadConfig({ DATABASE_URL: 'postgres://u:p@localhost:5432/db' })).toEqual({
      DATABASE_URL: 'postgres://u:p@localhost:5432/db',
      PORT: 3100,
      NODE_ENV: 'development',
      DEMO_OFFICER: 'Pn. Hafizah',
    });
  });

  it('reads the demo officer from DEMO_OFFICER', () => {
    expect(
      loadConfig({ DATABASE_URL: 'postgres://localhost/db', DEMO_OFFICER: 'En. Test' })
        .DEMO_OFFICER,
    ).toBe('En. Test');
  });

  it('reads PORT as a number', () => {
    expect(loadConfig({ DATABASE_URL: 'postgres://localhost/db', PORT: '8080' }).PORT).toBe(8080);
  });

  it('refuses to start without a valid DATABASE_URL', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
    expect(() => loadConfig({ DATABASE_URL: 'not a url' })).toThrow(/Invalid environment/);
  });
});
