import { z } from 'zod';

/** RFC 9457 problem details, plus the `message`/`fieldErrors` the web app's ApiError reads. */
export const ProblemSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  code: z.string().optional(),
  message: z.string(), // = detail ?? title, for the existing frontend parser
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});
export type Problem = z.infer<typeof ProblemSchema>;
