import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { logout as logoutApi } from '../services/auth'
import { useTranslation } from 'react-i18next'
import { setLanguagePreference, type SupportedLanguage } from '../services/preferences'

export default function Header() {
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { t, i18n } = useTranslation()
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement | null>(null)

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      const refreshToken = localStorage.getItem('refresh_token')
      const accessToken = localStorage.getItem('access_token')
      if (refreshToken && accessToken) {
        await logoutApi(refreshToken)
      }
    } catch (_) {
    } finally {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      navigate('/login')
      setIsLoggingOut(false)
    }
  }

  const handleChangeLanguage = (lng: SupportedLanguage) => {
    i18n.changeLanguage(lng)
    setLanguagePreference(lng)
    setLangOpen(false)
  }

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!langRef.current) return
      if (!langRef.current.contains(e.target as Node)) setLangOpen(false)
    }
    if (langOpen) document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [langOpen])

  return (
    <header className="sticky top-0 z-20 bg-black/30 supports-[backdrop-filter]:bg-black/30 backdrop-blur border-b border-white/10 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="font-semibold tracking-tight text-lg sm:text-xl no-underline hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white/40 rounded">
          list2gether
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
          <Link
            to="/"
            className="no-underline px-3 py-2 sm:px-4 sm:py-2 bg-white/10 rounded hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            {t('nav.home')}
          </Link>
          <div className="relative" ref={langRef}>
            <button
              type="button"
              aria-label="Change language"
              onClick={() => setLangOpen((v) => !v)}
              className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 transition focus:outline-none focus:ring-2 focus:ring-white/40"
            >
              <svg viewBox="0 0 32 32" className="w-5 h-5 text-white" fill="currentColor" aria-hidden>
                <path fillRule="evenodd" clipRule="evenodd" d="M16 5.63636C10.2763 5.63636 5.63636 10.2763 5.63636 16C5.63636 21.7236 10.2763 26.3636 16 26.3636C21.7237 26.3636 26.3638 21.7236 26.3638 16C26.3638 10.2763 21.7237 5.63636 16 5.63636ZM4 16C4 9.37258 9.37259 4 16 4C22.6274 4 28.0001 9.37258 28.0001 16C28.0001 22.6274 22.6274 28 16 28C9.37259 28 4 22.6274 4 16Z" />
                <path fillRule="evenodd" clipRule="evenodd" d="M26.909 16.7273H5.09082V15.2727H26.909V16.7273Z" />
                <path fillRule="evenodd" clipRule="evenodd" d="M15.2725 26.9088V5.09055H16.7271V26.9088H15.2725ZM21.2272 15.9996C21.2272 12.0492 19.8066 8.14107 17.0215 5.55703L17.8871 4.62402C20.9811 7.49452 22.5 11.7683 22.5 15.9996C22.5 20.231 20.9811 24.5048 17.8871 27.3753L17.0215 26.4422C19.8066 23.8582 21.2272 19.9501 21.2272 15.9996ZM9.63574 15.9997C9.63574 11.7744 11.1051 7.50288 14.1048 4.6309L14.985 5.55021C12.2876 8.13279 10.9085 12.0431 10.9085 15.9997C10.9085 19.9562 12.2876 23.8666 14.985 26.4491L14.1048 27.3684C11.1052 24.4964 9.63576 20.2249 9.63574 15.9997Z" />
                <path fillRule="evenodd" clipRule="evenodd" d="M16.0002 9.55957C19.9444 9.55957 23.9553 10.2889 26.6741 11.8077C26.981 11.9791 27.0908 12.3668 26.9193 12.6736C26.7481 12.9804 26.3602 13.0902 26.0535 12.9188C23.5991 11.5478 19.8329 10.8323 16.0002 10.8323C12.1673 10.8323 8.40115 11.5478 5.94682 12.9188C5.63998 13.0902 5.25231 12.9804 5.08091 12.6736C4.90953 12.3668 5.01931 11.9791 5.32615 11.8077C8.04504 10.2889 12.0559 9.55957 16.0002 9.55957ZM16.0002 22.0905C19.9444 22.0905 23.9553 21.361 26.6741 19.8423C26.981 19.6709 27.0908 19.2832 26.9193 18.9764C26.7481 18.6696 26.3602 18.5598 26.0535 18.7312C23.5991 20.1022 19.8329 20.8178 16.0002 20.8178C12.1673 20.8178 8.40115 20.1022 5.94682 18.7312C5.63998 18.5598 5.25231 18.6696 5.08091 18.9764C4.90953 19.2832 5.01931 19.6709 5.32615 19.8423C8.04504 21.361 12.0559 22.0905 16.0002 22.0905Z" />
              </svg>
            </button>
            {langOpen && (
              <div className="absolute right-0 mt-2 min-w-[8rem] bg-neutral-950 border border-white/10 rounded-lg shadow-lg shadow-white/10 p-1">
                <button
                  className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-white/5 ${i18n.language.startsWith('en') ? 'bg-white/5' : ''}`}
                  onClick={() => handleChangeLanguage('en')}
                >
                  EN
                </button>
                <button
                  className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-white/5 ${i18n.language.startsWith('pt') ? 'bg-white/5' : ''}`}
                  onClick={() => handleChangeLanguage('pt')}
                >
                  PT
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            aria-busy={isLoggingOut}
            className="inline-flex items-center bg-white text-black font-semibold rounded px-3 py-2 sm:px-4 sm:py-2 border border-white text-xs sm:text-sm hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoggingOut ? t('nav.loggingOut') : t('nav.logout')}
          </button>
        </nav>
      </div>
    </header>
  )
}


