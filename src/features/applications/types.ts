import type { z } from 'zod';
import type {
  ApplicationListParamsSchema,
  ApplicationListSchema,
  ApplicationStatusSchema,
  ApplicationSummarySchema,
  PremisesCategorySchema,
  SORT_FIELDS,
  SORT_ORDERS,
  StatusFilterSchema,
} from './schemas';

export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;
export type PremisesCategory = z.infer<typeof PremisesCategorySchema>;
export type StatusFilter = z.infer<typeof StatusFilterSchema>;
export type SortField = (typeof SORT_FIELDS)[number];
export type SortOrder = (typeof SORT_ORDERS)[number];
export type ApplicationSummary = z.infer<typeof ApplicationSummarySchema>;
export type ApplicationList = z.infer<typeof ApplicationListSchema>;
export type ApplicationListParams = z.infer<typeof ApplicationListParamsSchema>;
