import { useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { UserDTO } from '@/services/auth'

export function useAuth() {
  const navigate = useNavigate()

  const user = useMemo<UserDTO | null>(() => {
    try {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }, [])

  const token = useMemo(() => {
    return localStorage.getItem('access_token')
  }, [])

  const isAuthenticated = useMemo(() => {
    return !!token
  }, [token])

  const clearAuth = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
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
