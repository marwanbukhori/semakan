import { ApplicationDetailSchema } from '@semakan/contract';
import { z } from 'zod';
import {
  seedApplicationDetails,
  seedApplications,
  seedTimeline,
  toSummary,
  weightedStatus,
} from './applications';

describe('seedApplicationDetails', () => {
  it('returns 57 records', () => {
    expect(seedApplicationDetails()).toHaveLength(57);
  });

  it('is deterministic, so the demo looks the same on every load', () => {
    expect(seedApplicationDetails()).toEqual(seedApplicationDetails());
  });

  it('produces records that satisfy the detail contract', () => {
    const result = z.array(ApplicationDetailSchema).safeParse(seedApplicationDetails());
    expect(result.success).toBe(true);
  });

  it('gives every record a version that matches its timeline length', () => {
    for (const detail of seedApplicationDetails()) {
      expect(detail.version).toBe(detail.timeline.length);
    }
  });

  // The About > Overview tour links straight to /applications/app-001/review, so app-001
  // must stay `submitted` for that demo link to work.
  it('keeps app-001 submitted', () => {
    const first = seedApplicationDetails().find((detail) => detail.id === 'app-001');
    expect(first?.status).toBe('submitted');
  });
});

describe('toSummary', () => {
  it('extends the summaries without changing them', () => {
    expect(seedApplicationDetails().map(toSummary)).toEqual(seedApplications());
  });
});

// Not in the brief: these close the coverage gap left by the defensive fallback in
// `weightedStatus` and the exhaustiveness-check branch (`assertNever`) that `seedTimeline`
// inherits verbatim from the mock. See the report's Concerns.
describe('exhaustiveness and defensive fallbacks', () => {
  it('weightedStatus falls back to submitted once every weight is exhausted', () => {
    expect(weightedStatus(1)).toBe('submitted');
  });

  it('seedTimeline throws on an unhandled status', () => {
    const summary = seedApplications(1)[0]!;
    expect(() => seedTimeline({ ...summary, status: 'bogus' as never }, [])).toThrow(
      'Unhandled value',
    );
  });
});
