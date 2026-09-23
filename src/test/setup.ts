import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import './polyfills';

afterEach(() => {
  cleanup();
});
