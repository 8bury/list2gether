import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { joinList } from '@/services/lists'
import type { ApiException } from '@/services/api'

export default function JoinPage() {
  const navigate = useNavigate()
  const { code } = useParams<{ code: string }>()
  const { t } = useTranslation()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!code) {
      navigate('/home', { replace: true })
      return
    }

    ;(async () => {
      try {
        const res = await joinList(code)
        navigate(`/list/${res.list.id}`, { replace: true })
      } catch (err) {
        const apiErr = err as ApiException
        const message = apiErr.payload?.error || apiErr.message || t('lists.joinError', 'Failed to join list')
        setError(message)
      }
    })()
  }, [code, navigate, t])

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl text-center space-y-4">
          <h1 className="text-xl font-semibold">{t('lists.joinError', 'Failed to join list')}</h1>
          <p className="text-sm text-rose-400">{error}</p>
          <button
            onClick={() => navigate('/home')}
            className="text-sm text-white/60 hover:text-white underline"
          >
            {t('lists.goHome', 'Go to home')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <p className="text-neutral-400">{t('lists.joining', 'Joining...')}</p>
    </div>
  )
}
