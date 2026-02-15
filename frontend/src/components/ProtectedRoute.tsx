import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    // Store invite code so login can redirect back to /join/:code
    const joinMatch = location.pathname.match(/^\/join\/(.+)$/)
    if (joinMatch) {
      sessionStorage.setItem('pending_invite_code', joinMatch[1])
    }
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
