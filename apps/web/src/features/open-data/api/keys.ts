import type { FuelRange } from '../types';

export const openDataKeys = {
  all: ['open-data'] as const,
  fuelPrices: (range: FuelRange, dateStart: string) =>
    [...openDataKeys.all, 'fuelprice', range, dateStart] as const,
};
