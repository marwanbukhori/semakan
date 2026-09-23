import { renderHook, act } from '@testing-library/react';
import { i18n } from '@/shared/i18n';
import { useLocalized } from './localized';

describe('useLocalized', () => {
  afterEach(() => void i18n.changeLanguage('en'));

  it('picks the value for the current language', async () => {
    const { result, rerender } = renderHook(() => useLocalized());
    expect(result.current({ en: 'Hello', ms: 'Helo' })).toBe('Hello');

    await act(() => i18n.changeLanguage('ms'));
    rerender();
    expect(result.current({ en: 'Hello', ms: 'Helo' })).toBe('Helo');
  });
});
