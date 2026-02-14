import { getLocales } from 'expo-localization'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import fr from './locales/fr.json'

const deviceLanguage = getLocales()[0]?.languageCode ?? 'fr'

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: deviceLanguage === 'en' ? 'en' : 'fr',
  fallbackLng: 'fr',
  interpolation: {
    escapeValue: false,
  },
})

export { i18n }
