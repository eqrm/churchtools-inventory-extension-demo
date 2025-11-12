import i18next from 'i18next';
import type { Resource } from 'i18next';
import { initReactI18next } from 'react-i18next';

import common from './locales/en/common.json';
import undo from './locales/en/undo.json';

const resources: Resource = {
  en: {
    common,
    undo,
  },
};

let initialized = false;

export const initI18n = async (): Promise<void> => {
  if (initialized) {
    return;
  }

  await i18next.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    debug: import.meta.env.DEV,
    defaultNS: 'common',
    ns: ['common', 'undo'],
    resources,
    interpolation: {
      escapeValue: false,
    },
  });

  initialized = true;
};

export default i18next;
