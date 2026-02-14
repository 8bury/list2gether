import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { UserDTO } from '@/services/auth'
import { AUTH_CHANGED_EVENT, clearStoredAuth } from '@/services/auth_storage'

export function useAuth() {
  const navigate = useNavigate()

  const getStoredUser = (): UserDTO | null => {
    try {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }

  const getStoredToken = (): string | null => localStorage.getItem('access_token')

  const [user, setUser] = useState<UserDTO | null>(getStoredUser)

  const [token, setToken] = useState<string | null>(getStoredToken)

  const isAuthenticated = !!token

  const syncFromStorage = useCallback(() => {
    setUser(getStoredUser())
    setToken(getStoredToken())
  }, [])

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === null ||
        e.key === 'user' ||
        e.key === 'access_token' ||
        e.key === 'refresh_token'
      ) {
        syncFromStorage()
      }
    }
    const handleAuthChanged = () => syncFromStorage()

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChanged)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChanged)
    }
  }, [syncFromStorage])

  const clearAuth = useCallback(() => {
    clearStoredAuth()
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
