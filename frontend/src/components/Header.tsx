import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Settings, LogOut } from 'lucide-react'
import { logout as logoutApi } from '@/services/auth'
import { setLanguagePreference, type SupportedLanguage } from '@/services/preferences'
import { useAuth } from '@/hooks'
import { UserAvatar } from '@/components/UserAvatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'

export default function Header() {
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { t, i18n } = useTranslation()
  const { user, clearAuth } = useAuth()

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      const refreshToken = localStorage.getItem('refresh_token')
      await logoutApi(refreshToken)

    } catch {
      // ignore
    } finally {
      clearAuth()
      setIsLoggingOut(false)
    }
  }

  const handleChangeLanguage = (lng: SupportedLanguage) => {
    i18n.changeLanguage(lng)
    setLanguagePreference(lng)
  }

  return (
    <header className="sticky top-0 z-20 bg-black/30 supports-[backdrop-filter]:bg-black/30 backdrop-blur border-b border-white/10 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link
          to="/"
          className="font-semibold tracking-tight text-lg sm:text-xl no-underline hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white/40 rounded"
        >
          list2gether
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="User menu"
                className="rounded-full focus:outline-none focus:ring-2 focus:ring-white/40 hover:opacity-90 transition-opacity"
              >
                <UserAvatar
                  avatarUrl={user?.avatar_url}
                  name={user?.username || 'U'}
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Globe className="w-4 h-4 text-white/60" />
                  <span>{i18n.language.startsWith('pt') ? 'PT' : 'EN'}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    onClick={() => handleChangeLanguage('en')}
                    className={i18n.language.startsWith('en') ? 'text-violet-400' : ''}
                  >
                    English
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleChangeLanguage('pt')}
                    className={i18n.language.startsWith('pt') ? 'text-violet-400' : ''}
                  >
                    Português
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="w-4 h-4 text-white/60" />
                {t('nav.settings')}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-red-400 focus:text-red-400"
              >
                <LogOut className="w-4 h-4" />
                {isLoggingOut ? t('nav.loggingOut') : t('nav.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  )
}
