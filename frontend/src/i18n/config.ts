import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../locales/en.json'
import pt from '../locales/pt.json'
import { LANGUAGE_STORAGE_KEY, type SupportedLanguage } from '../services/preferences'

function detectInitialLanguage(): SupportedLanguage {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) as SupportedLanguage | null
    if (stored === 'en' || stored === 'pt') return stored
  } catch {}
  const browser = (navigator.languages && navigator.languages[0]) || navigator.language || 'en'
  const code = String(browser).toLowerCase()
  if (code.startsWith('pt')) return 'pt'
  return 'en'
}

const initialLng = detectInitialLanguage()

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      pt: { translation: pt },
    },
    lng: initialLng,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })

i18n.on('languageChanged', (lng) => {
  try {
    const normalized = (lng === 'pt' ? 'pt' : 'en') as SupportedLanguage
    document.documentElement.lang = normalized
    localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized)
  } catch {}
})

// Set the initial document language attribute
try {
  document.documentElement.lang = initialLng
} catch {}

export { i18n }


