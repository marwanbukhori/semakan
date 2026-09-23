import { assertNever } from './assertNever';

describe('assertNever', () => {
  it('throws with the unexpected value', () => {
    expect(() => assertNever('surprise' as never)).toThrow('Unhandled value: "surprise"');
  });
});
