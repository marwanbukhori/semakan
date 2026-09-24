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

export const DOCUMENT_KINDS = [
  'ssm_certificate',
  'premises_photo',
  'floor_plan',
  'fire_certificate',
] as const;
export const DocumentKindSchema = z.enum(DOCUMENT_KINDS);

export const ApplicationDocumentSchema = z.object({
  id: z.string(),
  kind: DocumentKindSchema,
  fileName: z.string(),
  sizeKb: z.number().int().positive(),
});

const timelineBase = { id: z.string(), at: z.iso.datetime(), actor: z.string() };

/** Each kind of event carries different fields; the UI switches on `kind` exhaustively. */
export const TimelineEventSchema = z.discriminatedUnion('kind', [
  z.object({ ...timelineBase, kind: z.literal('submitted') }),
  z.object({
    ...timelineBase,
    kind: z.literal('status_changed'),
    from: ApplicationStatusSchema,
    to: ApplicationStatusSchema,
    note: z.string().nullable(),
  }),
  z.object({
    ...timelineBase,
    kind: z.literal('info_requested'),
    requestedInfo: z.array(DocumentKindSchema).min(1),
    note: z.string(),
  }),
  z.object({ ...timelineBase, kind: z.literal('comment'), note: z.string() }),
]);

export const ApplicationDetailSchema = ApplicationSummarySchema.extend({
  applicantIdNumber: z.string(),
  applicantEmail: z.email(),
  applicantPhone: z.string(),
  businessAddress: z.string(),
  documents: z.array(ApplicationDocumentSchema),
  timeline: z.array(TimelineEventSchema),
  // Increases on every change; a review must send the version it was based on.
  version: z.number().int().min(1),
});

export const NOTE_MAX_LENGTH = 500;

// Messages are error codes, not prose: the UI translates them (see rules.ts).
const freeText = z.string().trim().max(NOTE_MAX_LENGTH, 'too_long');

export const ReviewDecisionSchema = z.discriminatedUnion('decision', [
  z.object({ decision: z.literal('approve'), note: freeText }),
  z.object({ decision: z.literal('reject'), reason: freeText.min(10, 'reason_too_short') }),
  z.object({
    decision: z.literal('request_info'),
    requestedInfo: z.array(DocumentKindSchema).min(1, 'requested_info_required'),
    note: freeText.min(5, 'note_too_short'),
  }),
]);

export const ReviewRequestSchema = z.object({
  version: z.number().int().min(1),
  review: ReviewDecisionSchema,
});
