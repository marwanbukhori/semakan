/** Freeze "now" without faking timers, so waitFor and debounces keep working. */
export function pinDate(iso: string): void {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(iso));
}

export function unpinDate(): void {
  vi.useRealTimers();
}
