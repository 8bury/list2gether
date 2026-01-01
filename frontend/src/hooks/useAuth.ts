import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { UserDTO } from '@/services/auth'

export function useAuth() {
  const navigate = useNavigate()

  const [user, setUser] = useState<UserDTO | null>(() => {
    try {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const [token, setToken] = useState<string | null>(() => 
    localStorage.getItem('access_token')
  )

  const isAuthenticated = !!token

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user') {
        try {
          setUser(e.newValue ? JSON.parse(e.newValue) : null)
        } catch {
          setUser(null)
        }
      }
      if (e.key === 'access_token') {
        setToken(e.newValue)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const clearAuth = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    navigate('/login')
  }, [navigate])

  const requireAuth = useCallback(() => {
    if (!token) {
      navigate('/login')
      return false
    }
    return true
  }, [token, navigate])

  return {
    user,
    token,
    isAuthenticated,
    clearAuth,
    requireAuth,
    userId: user?.id ?? null,
    username: user?.username ?? null,
    avatarUrl: user?.avatar_url ?? null,
  }
}
