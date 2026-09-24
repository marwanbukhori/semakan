import { ProblemSchema } from './problem';

const minimal = { type: 'about:blank', title: 'Conflict', status: 409, message: 'Conflict' };

const full = {
  ...minimal,
  title: 'Unprocessable Entity',
  status: 422,
  detail: 'The review is invalid.',
  code: 'reason_too_short',
  message: 'The review is invalid.',
  fieldErrors: { reason: ['reason_too_short'] },
};

describe('ProblemSchema', () => {
  it('parses a full problem', () => {
    expect(ProblemSchema.parse(full)).toEqual(full);
  });

  it('requires message, so the frontend always has something to show', () => {
    expect(ProblemSchema.safeParse({ ...full, message: undefined }).success).toBe(false);
  });

  it('treats detail, code and fieldErrors as optional', () => {
    expect(ProblemSchema.parse(minimal)).toEqual(minimal);
  });
});
