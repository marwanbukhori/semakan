// jsdom lacks browser APIs that Radix primitives (used inside MYDS) call.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

// The `??=` nullish-check reads these as unbound method references, which
// @typescript-eslint/unbound-method flags; these are stub assignments, not
// callback usages, so the rule doesn't apply here.
/* eslint-disable @typescript-eslint/unbound-method */
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.setPointerCapture ??= () => {};
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.scrollIntoView ??= () => {};
/* eslint-enable @typescript-eslint/unbound-method */
