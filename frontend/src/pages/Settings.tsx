import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { updateProfile, type UserDTO } from '../services/auth'
import { useTranslation } from 'react-i18next'

function getInitials(username: string): string {
  const parts = username.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return username.slice(0, 2).toUpperCase()
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  
  const [user, setUser] = useState<UserDTO | null>(null)
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      navigate('/login')
      return
    }
    
    try {
      const stored = localStorage.getItem('user')
      if (stored) {
        const userData = JSON.parse(stored) as UserDTO
        setUser(userData)
        setUsername(userData.username)
        setAvatarUrl(userData.avatar_url || '')
      }
    } catch {
      navigate('/login')
    }
  }, [navigate])
  
  const initials = useMemo(() => getInitials(username || 'U'), [username])
  
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
      localStorage.setItem('user', JSON.stringify(res.user))
      setUser(res.user)
      setSuccess(true)
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      const message = (err as any)?.payload?.details?.[0] || 
                      (err as any)?.payload?.error || 
                      (err as Error).message || 
                      'Failed to update profile'
      setError(message)
      
      if ((err as any)?.status === 401) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        navigate('/login')
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
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
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
            <div className="relative">
              {avatarUrl && !avatarError ? (
                <img
                  src={avatarUrl}
                  alt={username}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarError(true)}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white/20"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-2xl font-bold text-white border-4 border-white/20">
                  {initials}
                </div>
              )}
            </div>
            <p className="text-sm text-white/60">{t('settings.avatarPreview')}</p>
          </div>
          
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              {t('settings.username')}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
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
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-3 rounded-lg bg-white/[0.02] border border-white/5 text-white/50 cursor-not-allowed"
            />
          </div>
          
          {/* Avatar URL */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              {t('settings.avatarUrl')}
            </label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => {
                setAvatarUrl(e.target.value)
                setAvatarError(false)
              }}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
              placeholder={t('settings.avatarUrlPlaceholder')}
              maxLength={500}
            />
            <p className="mt-2 text-xs text-white/40">
              {t('settings.avatarUrlHint')}
            </p>
          </div>
          
          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges || !username.trim()}
              className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? t('settings.saving') : t('settings.save')}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

