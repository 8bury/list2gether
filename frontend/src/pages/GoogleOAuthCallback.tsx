import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { setStoredAuth } from '@/services/auth_storage'
import type { UserDTO } from '@/services/auth'

export default function GoogleOAuthCallbackPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const oauthError = params.get('error')
    if (oauthError) {
      window.history.replaceState(null, '', window.location.pathname)
      setError(t('auth.googleCallbackError'))
      return
    }

    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const userRaw = params.get('user')
    if (!accessToken || !refreshToken || !userRaw) {
      window.history.replaceState(null, '', window.location.pathname)
      setError(t('auth.googleCallbackError'))
      return
    }

    try {
      const user = JSON.parse(userRaw) as UserDTO
      setStoredAuth(accessToken, refreshToken, user)
      window.history.replaceState(null, '', window.location.pathname)

      const pendingCode = sessionStorage.getItem('pending_invite_code')
      if (pendingCode) {
        sessionStorage.removeItem('pending_invite_code')
        navigate(`/join/${pendingCode}`, { replace: true })
      } else {
        navigate('/home', { replace: true })
      }
    } catch {
      window.history.replaceState(null, '', window.location.pathname)
      setError(t('auth.googleCallbackError'))
    }
  }, [navigate, t])

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-white">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-white/5 p-6 text-center">
        {error ? (
          <>
            <h1 className="text-lg font-semibold">{t('auth.googleCallbackFailed')}</h1>
            <p className="mt-3 text-sm text-red-200">{error}</p>
            <Link className="mt-5 inline-flex text-sm underline" to="/login">
              {t('auth.signInLink')}
            </Link>
          </>
        ) : (
          <p className="text-sm text-gray-300">{t('auth.finishingGoogleLogin')}</p>
        )}
      </div>
    </div>
  )
}
