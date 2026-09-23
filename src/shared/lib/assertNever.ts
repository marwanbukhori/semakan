/** Compile-time exhaustiveness check: calling this with a non-`never` value is a type error. */
// #region practice:test-fixture
export function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${JSON.stringify(value)}`);
}
// #endregion
