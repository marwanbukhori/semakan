import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './en';
import { ms } from './ms';

export const LANGUAGES = ['en', 'ms'] as const;
export type Language = (typeof LANGUAGES)[number];

const STORAGE_KEY = 'semakan.language';

function readStoredLanguage(): Language {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'ms' ? 'ms' : 'en';
  } catch {
    return 'en';
  }
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ms: { translation: ms } },
  lng: readStoredLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  initAsync: false,
});

export { i18n };
