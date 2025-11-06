export const LANGUAGE_STORAGE_KEY = 'l2g_lang'

export type SupportedLanguage = 'en' | 'pt'

export function getLanguagePreference(): SupportedLanguage | null {
  try {
    const value = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (value === 'en' || value === 'pt') return value
    return null
  } catch {
    return null
  }
}

export function setLanguagePreference(lang: SupportedLanguage): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
  } catch {
    // ignore
  }
}


