import { DEFAULT_LIST_PARAMS } from '../schemas';
import { applicationKeys } from './keys';

describe('applicationKeys', () => {
  it('nests every list key under lists(), so one invalidation covers all filters', () => {
    const key = applicationKeys.list({ ...DEFAULT_LIST_PARAMS, status: 'approved' });
    expect(key.slice(0, 2)).toEqual(applicationKeys.lists());
    expect(applicationKeys.lists().slice(0, 1)).toEqual(applicationKeys.all);
  });

  it('gives different filters different keys', () => {
    expect(applicationKeys.list(DEFAULT_LIST_PARAMS)).not.toEqual(
      applicationKeys.list({ ...DEFAULT_LIST_PARAMS, page: 2 }),
    );
  });
});
