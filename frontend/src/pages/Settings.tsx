import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Header from '@/components/Header'
import { UserAvatar } from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks'
import { updateProfile } from '@/services/auth'
import { setStoredUser } from '@/services/auth_storage'
import type { ApiException } from '@/services/api'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user, clearAuth } = useAuth()

  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (user) {
      setUsername(user.username)
      setAvatarUrl(user.avatar_url || '')
    }
  }, [user])

  const handleSave = async () => {
    if (saving) return

    setError(null)
    setSuccess(false)
    setSaving(true)

    try {
      const res = await updateProfile({
        username: username.trim(),
        avatar_url: avatarUrl.trim(),
      })

      // Update localStorage with new user data
      setStoredUser(res.user)
      setSuccess(true)

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      const apiErr = err as ApiException
      const message = apiErr.payload?.details?.[0] ||
                      apiErr.payload?.error ||
                      apiErr.message ||
                      'Failed to update profile'
      setError(message)

      if (apiErr.status === 401) {
        clearAuth()
      }
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = user && (
    username.trim() !== user.username ||
    avatarUrl.trim() !== (user.avatar_url || '')
  )

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('misc.back')}
        </button>

        <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent mb-8">
          {t('settings.title')}
        </h1>

        {error && (
          <div className="mb-6 rounded-lg bg-rose-500/10 border border-rose-500/30 p-4 text-sm text-rose-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4 text-sm text-emerald-300">
            {t('settings.saved')}
          </div>
        )}

        <div className="space-y-6">
          {/* Avatar Preview */}
          <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-white/5 border border-white/10">
            <UserAvatar
              avatarUrl={avatarUrl}
              name={username}
              size="lg"
            />
            <p className="text-sm text-white/60">{t('settings.avatarPreview')}</p>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              {t('settings.username')}
            </label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('settings.usernamePlaceholder')}
              maxLength={50}
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              {t('settings.email')}
              <span className="ml-2 text-xs text-white/40 font-normal">
                ({t('settings.emailReadOnly')})
              </span>
            </label>
            <Input
              type="email"
              value={user?.email || ''}
              disabled
              className="bg-white/[0.02] border-white/5 text-white/50 cursor-not-allowed"
            />
          </div>

          {/* Avatar URL */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              {t('settings.avatarUrl')}
            </label>
            <Input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder={t('settings.avatarUrlPlaceholder')}
              maxLength={500}
            />
            <p className="mt-2 text-xs text-white/40">
              {t('settings.avatarUrlHint')}
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges || !username.trim()}
            >
              {saving ? t('settings.saving') : t('settings.save')}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
