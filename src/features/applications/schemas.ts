import { z } from 'zod';

export const APPLICATION_STATUSES = [
  'submitted',
  'under_review',
  'info_requested',
  'approved',
  'rejected',
] as const;
export const ApplicationStatusSchema = z.enum(APPLICATION_STATUSES);

export const PREMISES_CATEGORIES = [
  'food_beverage',
  'retail',
  'services',
  'workshop',
  'entertainment',
] as const;
export const PremisesCategorySchema = z.enum(PREMISES_CATEGORIES);

export const StatusFilterSchema = z.union([z.literal('all'), ApplicationStatusSchema]);

export const SORT_FIELDS = ['submittedAt', 'referenceNo', 'businessName'] as const;
export const SORT_ORDERS = ['asc', 'desc'] as const;
export const PAGE_SIZE = 10;

export const ApplicationSummarySchema = z.object({
  id: z.string(),
  referenceNo: z.string(),
  applicantName: z.string(),
  businessName: z.string(),
  premisesCategory: PremisesCategorySchema,
  state: z.string(),
  submittedAt: z.iso.datetime(),
  status: ApplicationStatusSchema,
  assignedOfficerName: z.string().nullable(),
});

export const ApplicationListSchema = z.object({
  items: z.array(ApplicationSummarySchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
});

/**
 * List filters as they appear in the URL. The URL is user input, so every
 * field falls back to its default instead of throwing.
 */
export const ApplicationListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  status: StatusFilterSchema.catch('all'),
  // Over-long searches are cut to 100 characters rather than thrown away.
  q: z
    .string()
    .trim()
    .transform((s) => s.slice(0, 100))
    .catch(''),
  sort: z.enum(SORT_FIELDS).catch('submittedAt'),
  order: z.enum(SORT_ORDERS).catch('desc'),
});

export const DEFAULT_LIST_PARAMS = ApplicationListParamsSchema.parse({});
