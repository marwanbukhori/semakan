import type { z } from 'zod';
import type {
  CatalogueMetaSchema,
  ChangeRowSchema,
  FUEL_KEYS,
  FUEL_RANGES,
  FuelFiltersSchema,
  FuelPriceResponseSchema,
  LevelRowSchema,
} from './schemas';

export type FuelKey = (typeof FUEL_KEYS)[number];
export type FuelRange = (typeof FUEL_RANGES)[number];
export type LevelRow = z.infer<typeof LevelRowSchema>;
export type ChangeRow = z.infer<typeof ChangeRowSchema>;
export type CatalogueMeta = z.output<typeof CatalogueMetaSchema>;
export type FuelPrices = z.output<typeof FuelPriceResponseSchema>;
export type FuelFilters = z.output<typeof FuelFiltersSchema>;
