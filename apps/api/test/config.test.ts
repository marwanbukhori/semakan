import { loadConfig } from '../src/config';

describe('loadConfig', () => {
  it('applies defaults', () => {
    expect(loadConfig({ DATABASE_URL: 'postgres://u:p@localhost:5432/db' })).toEqual({
      DATABASE_URL: 'postgres://u:p@localhost:5432/db',
      PORT: 3000,
      NODE_ENV: 'development',
    });
  });

  it('reads PORT as a number', () => {
    expect(loadConfig({ DATABASE_URL: 'postgres://localhost/db', PORT: '8080' }).PORT).toBe(8080);
  });

  it('refuses to start without a valid DATABASE_URL', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
    expect(() => loadConfig({ DATABASE_URL: 'not a url' })).toThrow(/Invalid environment/);
  });
});
