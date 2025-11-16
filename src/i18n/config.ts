import i18next from 'i18next';
import type { Resource } from 'i18next';
import { initReactI18next } from 'react-i18next';

import common from './locales/en/common.json';
import damage from './locales/en/damage.json';
import undo from './locales/en/undo.json';
import views from './locales/en/views.json';
import kits from './locales/en/kits.json';
import settingsNamespace from './locales/en/settings.json';

const resources: Resource = {
  en: {
    common,
    damage,
    undo,
    views,
    kits,
    settings: settingsNamespace,
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
    ns: ['common', 'damage', 'undo', 'views', 'kits', 'settings'],
    resources,
    interpolation: {
      escapeValue: false,
    },
  });

  initialized = true;
};

export default i18next;
