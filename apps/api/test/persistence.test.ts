import { inject } from 'vitest';
import type { DataSource } from 'typeorm';
import { ApplicationDetailSchema, SORT_FIELDS, SORT_ORDERS } from '@semakan/contract';
import type { ApplicationListParams, StatusFilter, TimelineEvent } from '@semakan/contract';
import {
  CURRENT_OFFICER,
  queryApplications,
  seedApplicationDetails,
  seedApplications,
} from '@semakan/seed';
import { ApplicationsRepository } from '../src/applications/applications.repository';
import { openTestDataSource, resetDatabase } from './database';

let ds: DataSource;
let repo: ApplicationsRepository;

beforeAll(async () => {
  ds = await openTestDataSource(inject('databaseUrl'));
  repo = new ApplicationsRepository(ds);
});
beforeEach(() => resetDatabase(ds));
afterAll(() => ds?.destroy());

it('round-trips every seeded application through findDetail', async () => {
  for (const expected of seedApplicationDetails()) {
    const actual = await repo.findDetail(expected.id);
    expect(actual).toEqual(expected);
    expect(ApplicationDetailSchema.safeParse(actual).success).toBe(true);
  }
});

it('returns null for an unknown id', async () => {
  expect(await repo.findDetail('app-999')).toBeNull();
});

it('lists exactly what the in-memory reference query returns, for the whole matrix', async () => {
  const all = seedApplications();
  const statuses: StatusFilter[] = ['all', 'submitted', 'approved'];
  for (const status of statuses)
    for (const q of ['', 'lpp-2026-100', 'tan'])
      for (const sort of SORT_FIELDS)
        for (const order of SORT_ORDERS)
          for (const page of [1, 2, 99]) {
            const params: ApplicationListParams = { status, q, sort, order, page };
            expect(await repo.list(params), JSON.stringify(params)).toEqual(
              queryApplications(all, params),
            );
          }
});

it('orders mixed-case and punctuated names the way localeCompare does, not by byte order', async () => {
  const names = ['apple Mart', 'Zebra Mart', 'a-b Mart', 'ab Mart', 'Éclair Mart', 'eclair Mart'];
  const all = seedApplications().map((a, i) => ({
    ...a,
    businessName: names[i] ?? a.businessName,
  }));
  for (const [i, name] of names.entries()) {
    await ds.query('UPDATE applications SET business_name = $1 WHERE id = $2', [name, all[i]!.id]);
  }
  for (const order of SORT_ORDERS) {
    const params = { status: 'all', q: '', sort: 'businessName', order, page: 1 } as const;
    expect(await repo.list(params, 100)).toEqual(queryApplications(all, params, 100));
  }
});

it('treats %, _ and \\ in the search as literal characters', async () => {
  const params = { status: 'all', sort: 'referenceNo', order: 'asc', page: 1 } as const;
  const target = seedApplicationDetails()[0]!;
  await ds.query('UPDATE applications SET business_name = $1 WHERE id = $2', [
    'A\\B Trading',
    target.id,
  ]);

  for (const q of ['%', '_', 'LPP_2026']) {
    expect((await repo.list({ ...params, q })).total, q).toBe(0);
  }

  const result = await repo.list({ ...params, q: '\\' });
  expect(result.total).toBe(1);
  expect(result.items[0]?.id).toBe(target.id);
});

it('rejects a status outside the allowed list', async () => {
  await expect(
    ds.query(`UPDATE applications SET status = 'archived' WHERE id = 'app-001'`),
  ).rejects.toThrow(/check constraint/);
});

it('saves a review once per version and reports a conflict for a stale version', async () => {
  const before = seedApplicationDetails().find((a) => a.status === 'submitted')!;
  const event: TimelineEvent = {
    id: `${before.id}-ev-2`,
    kind: 'status_changed',
    at: '2026-09-24T01:00:00.000Z',
    actor: CURRENT_OFFICER,
    from: 'submitted',
    to: 'under_review',
    note: null,
  };
  const after = {
    ...before,
    status: 'under_review' as const,
    assignedOfficerName: CURRENT_OFFICER,
    timeline: [...before.timeline, event],
    version: before.version + 1,
  };

  expect(await ds.transaction((m) => repo.saveReview(m, before, after, event))).toBe('ok');
  expect(await ds.transaction((m) => repo.saveReview(m, before, after, event))).toBe('conflict');
  expect(await repo.findDetail(before.id)).toEqual(after);
});

it('reports a conflict deterministically when the WHERE-version guard fails', async () => {
  // Bumps the row's version directly with SQL, out from under `before`, so the
  // guard's failure does not depend on an HTTP race actually serialising.
  const staleBefore = seedApplicationDetails().find((a) => a.status === 'submitted')!;
  await ds.query('UPDATE applications SET version = version + 1 WHERE id = $1', [staleBefore.id]);
  const timelineBefore = await ds.query<[{ n: number }]>(
    'SELECT count(*)::int AS n FROM timeline_events WHERE application_id = $1',
    [staleBefore.id],
  );

  const event: TimelineEvent = {
    id: `${staleBefore.id}-ev-2`,
    kind: 'status_changed',
    at: '2026-09-24T01:00:00.000Z',
    actor: CURRENT_OFFICER,
    from: 'submitted',
    to: 'under_review',
    note: null,
  };
  const after = {
    ...staleBefore,
    status: 'under_review' as const,
    assignedOfficerName: CURRENT_OFFICER,
    timeline: [...staleBefore.timeline, event],
    version: staleBefore.version + 1,
  };

  expect(await ds.transaction((m) => repo.saveReview(m, staleBefore, after, event))).toBe(
    'conflict',
  );
  const timelineAfter = await ds.query<[{ n: number }]>(
    'SELECT count(*)::int AS n FROM timeline_events WHERE application_id = $1',
    [staleBefore.id],
  );
  expect(timelineAfter[0].n).toBe(timelineBefore[0].n);
});
