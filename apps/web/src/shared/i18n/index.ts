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

// Screen readers pick pronunciation from <html lang>, so it follows the UI language.
i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language;
});

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ms: { translation: ms } },
  lng: readStoredLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  initAsync: false,
});
document.documentElement.lang = i18n.language;

export { i18n };
