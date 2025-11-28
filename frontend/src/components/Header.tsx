import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState, useMemo } from 'react'
import { logout as logoutApi, type UserDTO } from '../services/auth'
import { useTranslation } from 'react-i18next'
import { setLanguagePreference, type SupportedLanguage } from '../services/preferences'

function getInitials(username: string): string {
  const parts = username.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return username.slice(0, 2).toUpperCase()
}

interface AvatarProps {
  avatarUrl?: string
  username: string
  size?: 'sm' | 'md'
}

function Avatar({ avatarUrl, username, size = 'md' }: AvatarProps) {
  const [imgError, setImgError] = useState(false)
  const initials = useMemo(() => getInitials(username), [username])
  
  const sizeClasses = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-9 h-9 sm:w-10 sm:h-10 text-sm'
  
  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`${sizeClasses} rounded-full object-cover border-2 border-white/20`}
      />
    )
  }
  
  return (
    <div className={`${sizeClasses} rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center font-semibold text-white border-2 border-white/20`}>
      {initials}
    </div>
  )
}

export default function Header() {
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { t, i18n } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [langSubmenuOpen, setLangSubmenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  
  const user: UserDTO | null = useMemo(() => {
    try {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }, [])

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
    setLangSubmenuOpen(false)
    setMenuOpen(false)
  }

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
        setLangSubmenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [menuOpen])

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
          
          {/* Avatar Menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-label="User menu"
              onClick={() => {
                setMenuOpen((v) => !v)
                setLangSubmenuOpen(false)
              }}
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-white/40 hover:opacity-90 transition-opacity"
            >
              <Avatar
                avatarUrl={user?.avatar_url}
                username={user?.username || 'U'}
              />
            </button>
            
            {menuOpen && (
              <div className="absolute right-0 mt-2 min-w-[10rem] bg-neutral-950 border border-white/10 rounded-lg shadow-lg shadow-black/40 py-1 overflow-hidden">
                {/* Language submenu */}
                <div className="relative">
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 flex items-center justify-between gap-2"
                    onClick={() => setLangSubmenuOpen((v) => !v)}
                  >
                    <span className="flex items-center gap-2">
                      <svg viewBox="0 0 20 20" className="w-4 h-4 text-white/60" fill="currentColor" aria-hidden>
                        <path fillRule="evenodd" clipRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM1 10a9 9 0 1118 0 9 9 0 01-18 0z" />
                        <path fillRule="evenodd" clipRule="evenodd" d="M10 2c-1.5 0-3 2.5-3 8s1.5 8 3 8 3-2.5 3-8-1.5-8-3-8zM6 10c0-2.5.5-4.5 1.2-5.8C7.9 3 8.9 2.5 10 2.5s2.1.5 2.8 1.7c.7 1.3 1.2 3.3 1.2 5.8s-.5 4.5-1.2 5.8c-.7 1.2-1.7 1.7-2.8 1.7s-2.1-.5-2.8-1.7C6.5 14.5 6 12.5 6 10z" />
                        <path d="M2 10h16M10 2v16" stroke="currentColor" strokeWidth="1" fill="none" />
                      </svg>
                      {i18n.language.startsWith('pt') ? 'PT' : 'EN'}
                    </span>
                    <svg className={`w-4 h-4 text-white/40 transition-transform ${langSubmenuOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  
                  {langSubmenuOpen && (
                    <div className="border-t border-white/5 bg-white/[0.02]">
                      <button
                        className={`w-full text-left px-6 py-2 text-sm hover:bg-white/5 ${i18n.language.startsWith('en') ? 'text-violet-400' : 'text-white/80'}`}
                        onClick={() => handleChangeLanguage('en')}
                      >
                        English
                      </button>
                      <button
                        className={`w-full text-left px-6 py-2 text-sm hover:bg-white/5 ${i18n.language.startsWith('pt') ? 'text-violet-400' : 'text-white/80'}`}
                        onClick={() => handleChangeLanguage('pt')}
                      >
                        Português
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="border-t border-white/5 my-1" />
                
                {/* Settings */}
                <button
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 flex items-center gap-2"
                  onClick={() => {
                    setMenuOpen(false)
                    navigate('/settings')
                  }}
                >
                  <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {t('nav.settings')}
                </button>
                
                <div className="border-t border-white/5 my-1" />
                
                {/* Logout */}
                <button
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 flex items-center gap-2 text-red-400"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  {isLoggingOut ? t('nav.loggingOut') : t('nav.logout')}
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}
