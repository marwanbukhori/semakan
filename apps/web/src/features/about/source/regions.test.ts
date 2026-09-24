import { extractRegion } from './regions';

const text = [
  'import x from "y";',
  '',
  '// #region practice:first',
  '  export function a() {',
  '    return 1;',
  '  }',
  '// #endregion',
  '# #region practice:yaml',
  'jobs:',
  '  check: true',
  '# #endregion',
].join('\n');

describe('extractRegion', () => {
  it('returns the dedented body and its 1-based line range', () => {
    expect(extractRegion(text, 'first')).toEqual({
      code: 'export function a() {\n  return 1;\n}',
      startLine: 4,
      endLine: 6,
    });
  });

  it('understands # comments for YAML', () => {
    expect(extractRegion(text, 'yaml')?.code).toBe('jobs:\n  check: true');
  });

  it('returns null for a missing region or a region that never ends', () => {
    expect(extractRegion(text, 'nope')).toBeNull();
    expect(extractRegion('// #region practice:open\nconst a = 1;', 'open')).toBeNull();
  });

  it('does not match a region whose id only starts the same', () => {
    expect(extractRegion('// #region practice:firstly\nx\n// #endregion', 'first')).toBeNull();
  });

  it('drops marker lines of other regions nested inside, and reports the true last body line', () => {
    const nested =
      '// #region practice:outer\na\n// #region practice:inner\nb\n// #endregion\n// #endregion';
    expect(extractRegion(nested, 'outer')).toEqual({ code: 'a\nb', startLine: 2, endLine: 4 });
  });

  it('handles a nested opener directly after the outer marker', () => {
    const nested =
      '// #region practice:outer\n// #region practice:inner\nb\n// #endregion\n// #endregion';
    expect(extractRegion(nested, 'outer')).toEqual({ code: 'b', startLine: 3, endLine: 3 });
  });

  it('returns an empty body with startLine one past the marker and endLine one before it', () => {
    expect(extractRegion('// #region practice:empty\n// #endregion', 'empty')).toEqual({
      code: '',
      startLine: 2,
      endLine: 1,
    });
  });
});
