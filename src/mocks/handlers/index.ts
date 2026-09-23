import type { RequestHandler } from 'msw';
import { applicationHandlers } from './applications';

export const handlers: RequestHandler[] = [...applicationHandlers];
