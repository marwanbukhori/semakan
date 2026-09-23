import '@testing-library/jest-dom/vitest';
import '@/shared/i18n';
import { cleanup } from '@testing-library/react';
import { resetApplications } from '@/mocks/db/applications';
import { resetDevControls } from '@/mocks/devControls';
import { server } from '@/mocks/node';
import './polyfills';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
  resetDevControls();
  resetApplications();
  localStorage.clear();
});
afterAll(() => server.close());
