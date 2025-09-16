import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { logout as logoutApi } from '../services/auth'

export default function Header() {
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

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
            Início
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            aria-busy={isLoggingOut}
            className="inline-flex items-center bg-white text-black font-semibold rounded px-3 py-2 sm:px-4 sm:py-2 border border-white text-xs sm:text-sm hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoggingOut ? 'Saindo…' : 'Sair'}
          </button>
        </nav>
      </div>
    </header>
  )
}


