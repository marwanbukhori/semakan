import type { RequestHandler } from 'msw';
import { applicationHandlers } from './applications';
import { dataGovHandlers } from './dataGov';

export const handlers: RequestHandler[] = [...applicationHandlers, ...dataGovHandlers];
