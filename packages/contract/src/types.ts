import type { z } from 'zod';
import type {
  ApplicationDetailSchema,
  ApplicationDocumentSchema,
  ApplicationListParamsSchema,
  ApplicationListSchema,
  ApplicationStatusSchema,
  ApplicationSummarySchema,
  DocumentKindSchema,
  PremisesCategorySchema,
  ReviewDecisionSchema,
  ReviewRequestSchema,
  SORT_FIELDS,
  SORT_ORDERS,
  StatusFilterSchema,
  TimelineEventSchema,
} from './applications';

// #region practice:types-from-schemas
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;
export type PremisesCategory = z.infer<typeof PremisesCategorySchema>;
export type StatusFilter = z.infer<typeof StatusFilterSchema>;
export type SortField = (typeof SORT_FIELDS)[number];
export type SortOrder = (typeof SORT_ORDERS)[number];
export type ApplicationSummary = z.infer<typeof ApplicationSummarySchema>;
export type ApplicationList = z.infer<typeof ApplicationListSchema>;
export type ApplicationListParams = z.infer<typeof ApplicationListParamsSchema>;
export type DocumentKind = z.infer<typeof DocumentKindSchema>;
export type ApplicationDocument = z.infer<typeof ApplicationDocumentSchema>;
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
export type ApplicationDetail = z.infer<typeof ApplicationDetailSchema>;
export type ReviewDecisionInput = z.input<typeof ReviewDecisionSchema>;
export type ReviewDecision = z.output<typeof ReviewDecisionSchema>;
export type Decision = ReviewDecision['decision'];
export type ReviewRequest = z.infer<typeof ReviewRequestSchema>;
// #endregion
