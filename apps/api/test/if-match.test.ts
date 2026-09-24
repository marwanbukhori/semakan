import { parseIfMatch } from '../src/http/if-match';

describe('parseIfMatch', () => {
  it.each([
    ['"3"', 3],
    ['W/"3"', 3],
    ['3', 3],
    [' "12" ', 12],
  ])('parses %s', (header, expected) => {
    expect(parseIfMatch(header)).toBe(expected);
  });

  it.each([undefined, '', '  '])('reports %j as missing', (header) => {
    expect(parseIfMatch(header)).toBe('missing');
  });

  it.each(['*', '"3', '3"', 'W/3', '"abc"', '"1", "2"', '-1', '"99999999999999999999"'])(
    'reports %s as invalid',
    (header) => {
      expect(parseIfMatch(header)).toBe('invalid');
    },
  );
});
