import { act } from '@testing-library/react';
import { i18n } from './index';

describe('i18n', () => {
  afterEach(() => act(() => i18n.changeLanguage('en')));

  it('keeps <html lang> in sync with the current language', async () => {
    expect(document.documentElement.lang).toBe('en');

    await act(() => i18n.changeLanguage('ms'));

    expect(document.documentElement.lang).toBe('ms');
  });
});
