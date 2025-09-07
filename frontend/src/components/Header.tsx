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
    <header className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-neutral-800">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/home" className="font-semibold tracking-tight text-xl no-underline hover:opacity-90">list2gether</Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link to="/home" className="underline">Início</Link>
          <button onClick={handleLogout} className="bg-white text-black rounded-lg px-3 py-1.5 border border-white text-sm disabled:opacity-70">
            {isLoggingOut ? 'Saindo…' : 'Sair'}
          </button>
        </nav>
      </div>
    </header>
  )
}


