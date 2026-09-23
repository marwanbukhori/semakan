import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Language } from '@/shared/i18n';

/** Long-form content in both languages; missing one is a type error. */
export type Localized<T> = Record<Language, T>;

export function useLocalized() {
  const { i18n } = useTranslation();
  const language: Language = i18n.language === 'ms' ? 'ms' : 'en';
  return useCallback(<T>(value: Localized<T>): T => value[language], [language]);
}
