import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Copy, Check, ArrowRight, Trash2, LogOut, Crown, User, Film, Eye, MessageSquare, UserPlus, Clapperboard } from 'lucide-react'
import Header from '@/components/Header'
import { UserAvatar } from '@/components/UserAvatar'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks'
import {
  getUserLists,
  createList,
  joinList,
  deleteList,
  leaveList,
  getUserStats,
  getUserActivity,
  type UserListDTO,
  type UserStatsDTO,
  type ActivityItemDTO,
} from '@/services/lists'
import type { ApiException } from '@/services/api'

function relativeTime(dateStr: string): { value: string; isJustNow: boolean } {
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  const mo = Math.floor(d / 30)
  const y = Math.floor(d / 365)
  if (s < 60) return { value: '', isJustNow: true }
  if (m < 60) return { value: `${m}min`, isJustNow: false }
  if (h < 24) return { value: `${h}h`, isJustNow: false }
  if (d < 30) return { value: `${d}d`, isJustNow: false }
  if (mo < 12) return { value: `${mo}m`, isJustNow: false }
  return { value: `${y}a`, isJustNow: false }
}

function PosterStack({ urls }: { urls?: string[] | null }) {
  const filled = (urls ?? []).slice(0, 4)
  if (filled.length === 0) {
    return (
      <div className="flex items-center justify-center w-[88px] h-[60px] rounded-lg bg-white/5 border border-white/10 shrink-0">
        <Clapperboard className="w-5 h-5 text-white/20" />
      </div>
    )
  }
  return (
    <div className="flex -space-x-2 shrink-0">
      {filled.map((url, i) => (
        <div
          key={i}
          className="w-10 h-14 rounded-md overflow-hidden border border-white/20 shrink-0 shadow-md"
          style={{ zIndex: filled.length - i }}
        >
          <img src={url} alt="" className="w-full h-full object-cover" draggable={false} />
        </div>
      ))}
    </div>
  )
}

function MemberAvatars({ members }: { members?: { user_id: number; username: string; avatar_url?: string | null }[] | null }) {
  const list = (members ?? []).slice(0, 4)
  if (list.length === 0) return null
  return (
    <div className="flex -space-x-1.5">
      {list.map((m) => (
        <UserAvatar key={m.user_id} name={m.username} avatarUrl={m.avatar_url} size="xs" className="ring-1 ring-black" />
      ))}
    </div>
  )
}

function SkeletonListItem() {
  return (
    <li className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-3 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-48 bg-white/10" />
            <Skeleton className="h-5 w-5 rounded-full bg-white/10" />
          </div>
          <Skeleton className="h-3 w-2/3 bg-white/10" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full bg-white/10" />
            <Skeleton className="h-6 w-24 rounded-full bg-white/10" />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="w-6 h-6 rounded-full bg-white/10" />)}
            </div>
            <Skeleton className="h-3 w-16 bg-white/10" />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Skeleton className="h-9 w-9 rounded-md bg-white/10" />
          <Skeleton className="h-9 w-9 rounded-md bg-white/10" />
        </div>
      </div>
    </li>
  )
}

function ActivityIcon({ type }: { type: ActivityItemDTO['type'] }) {
  const base = 'w-4 h-4'
  switch (type) {
    case 'movie_added': return <Plus className={`${base} text-emerald-400`} />
    case 'movie_watched': return <Eye className={`${base} text-blue-400`} />
    case 'comment': return <MessageSquare className={`${base} text-violet-400`} />
    case 'member_joined': return <UserPlus className={`${base} text-amber-400`} />
  }
}

function ActivityFeedItem({ item }: { item: ActivityItemDTO }) {
  const { t } = useTranslation()
  const rt = relativeTime(item.timestamp)
  const timeStr = rt.isJustNow ? t('lists.justNow') : t('lists.lastActivity', { time: rt.value })

  let description: string
  switch (item.type) {
    case 'movie_added':
      description = item.username
        ? t('home.activity.movie_added', { movie: item.movie_title ?? '?', list: item.list_name })
        : t('home.activity.movie_added', { movie: item.movie_title ?? '?', list: item.list_name })
      break
    case 'movie_watched':
      description = t('home.activity.movie_watched', { movie: item.movie_title ?? '?', list: item.list_name })
      break
    case 'comment':
      description = t('home.activity.comment', { movie: item.movie_title ?? '?', list: item.list_name })
      break
    case 'member_joined':
      description = t('home.activity.member_joined', { list: item.list_name })
      break
  }

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0">
      {item.movie_poster_url ? (
        <div className="w-8 h-11 rounded overflow-hidden shrink-0 bg-white/5">
          <img src={item.movie_poster_url} alt="" className="w-full h-full object-cover" draggable={false} />
        </div>
      ) : item.username ? (
        <div className="shrink-0 mt-0.5">
          <UserAvatar name={item.username} avatarUrl={item.avatar_url} size="xs" />
        </div>
      ) : (
        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
          <ActivityIcon type={item.type} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        {item.username && (
          <p className="text-xs font-semibold text-white/90 truncate leading-tight">{item.username}</p>
        )}
        <p className="text-xs text-neutral-400 leading-snug line-clamp-2">{description}</p>
        <p className="text-[10px] text-neutral-600 mt-0.5">{timeStr}</p>
      </div>
      <div className="shrink-0 mt-0.5">
        <ActivityIcon type={item.type} />
      </div>
    </div>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { clearAuth } = useAuth()

  const [lists, setLists] = useState<UserListDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [stats, setStats] = useState<UserStatsDTO | null>(null)
  const [activity, setActivity] = useState<ActivityItemDTO[]>([])

  // Create/Join states
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [popoverMode, setPopoverMode] = useState<'create' | 'join'>('create')
  const [creating, setCreating] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [joining, setJoining] = useState(false)
  const [inviteCode, setInviteCode] = useState('')

  // Confirmation dialog states
  const [confirmDelete, setConfirmDelete] = useState<UserListDTO | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState<UserListDTO | null>(null)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [listsRes, statsRes, activityRes] = await Promise.allSettled([
          getUserLists(),
          getUserStats(),
          getUserActivity(20),
        ])
        if (listsRes.status === 'fulfilled') {
          setLists(listsRes.value.lists)
        } else {
          const apiErr = listsRes.reason as ApiException
          const message = apiErr.payload?.error || apiErr.message || 'Falha ao carregar listas'
          setError(message)
          if (apiErr.status === 401) clearAuth()
        }
        if (statsRes.status === 'fulfilled') setStats(statsRes.value)
        if (activityRes.status === 'fulfilled') setActivity(activityRes.value.activity ?? [])
      } finally {
        setLoading(false)
      }
    })()
  }, [clearAuth])

  const handleCopy = async (list: UserListDTO) => {
    try {
      await navigator.clipboard.writeText(window.location.origin + '/join/' + list.invite_code)
      setCopiedId(list.id)
      window.setTimeout(() => setCopiedId(null), 1500)
    } catch {
      // ignore
    }
  }

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await deleteList(confirmDelete.id)
      setLists((prev) => prev.filter((l) => l.id !== confirmDelete.id))
      setConfirmDelete(null)
    } catch (err) {
      const apiErr = err as ApiException
      const message = apiErr.payload?.error || apiErr.message || 'Falha ao excluir lista'
      setError(message)
      if (apiErr.status === 401) clearAuth()
    } finally {
      setDeleting(false)
    }
  }

  const handleConfirmLeave = async () => {
    if (!confirmLeave) return
    setLeaving(true)
    try {
      await leaveList(confirmLeave.id)
      setLists((prev) => prev.filter((l) => l.id !== confirmLeave.id))
      setConfirmLeave(null)
    } catch (err) {
      const apiErr = err as ApiException
      const message = apiErr.payload?.error || apiErr.message || 'Falha ao sair da lista'
      setError(message)
      if (apiErr.status === 401) clearAuth()
    } finally {
      setLeaving(false)
    }
  }

  const openPopover = (mode: 'create' | 'join') => {
    setError(null)
    setPopoverMode(mode)
    setPopoverOpen(true)
    if (mode === 'create') {
      setCreateName('')
      setCreateDescription('')
    } else {
      setInviteCode('')
    }
  }

  const handleCreate = async () => {
    if (!createName.trim()) return
    setCreating(true)
    try {
      await createList({ name: createName.trim(), description: createDescription.trim() || undefined })
      setCreateName('')
      setCreateDescription('')
      setPopoverOpen(false)
      const res = await getUserLists()
      setLists(res.lists)
    } catch (err) {
      const apiErr = err as ApiException
      const message = apiErr.payload?.error || apiErr.message
      setError(message)
      if (apiErr.status === 401) clearAuth()
    } finally {
      setCreating(false)
    }
  }

  const handleJoin = async () => {
    if (!inviteCode.trim()) return
    setJoining(true)
    try {
      const res = await joinList(inviteCode.trim())
      setInviteCode('')
      setPopoverOpen(false)
      navigate(`/list/${res.list.id}`)
    } catch (err) {
      const apiErr = err as ApiException
      const message = apiErr.payload?.error || apiErr.message
      setError(message)
      if (apiErr.status === 401) clearAuth()
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Stats bar */}
        {stats !== null && (
          <div className="flex gap-3">
            <div className="inline-flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                <Film className="w-4.5 h-4.5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none">{stats.watched_this_month}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{t('home.watchedThisMonth')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Header row */}
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
            {t('lists.title')}
          </h2>

          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                onClick={() => { if (!popoverOpen) openPopover('create') }}
                className="gap-2"
              >
                <Plus className={`w-4 h-4 transition-transform duration-200 ${popoverOpen ? 'rotate-45' : ''}`} />
                {t('lists.new')}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="p-3 pb-0">
                <div className="relative flex p-1 rounded-full bg-white/5">
                  <div
                    className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-full shadow-lg transition-all duration-300 ease-out"
                    style={{ left: popoverMode === 'create' ? '4px' : 'calc(50% + 0px)' }}
                  />
                  <button
                    className={`relative flex-1 py-2 text-sm font-medium rounded-full transition-colors duration-200 z-10 ${popoverMode === 'create' ? 'text-black' : 'text-neutral-400 hover:text-white'}`}
                    onClick={() => { setPopoverMode('create'); setError(null) }}
                  >
                    {t('lists.popover.create')}
                  </button>
                  <button
                    className={`relative flex-1 py-2 text-sm font-medium rounded-full transition-colors duration-200 z-10 ${popoverMode === 'join' ? 'text-black' : 'text-neutral-400 hover:text-white'}`}
                    onClick={() => { setPopoverMode('join'); setError(null) }}
                  >
                    {t('lists.popover.join')}
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {popoverMode === 'create' ? (
                  <>
                    <Input
                      placeholder={t('lists.namePlaceholder')}
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                      autoFocus
                    />
                    <Input
                      placeholder={t('lists.descriptionOptional')}
                      value={createDescription}
                      onChange={(e) => setCreateDescription(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    />
                  </>
                ) : (
                  <Input
                    placeholder={t('lists.inviteCode.placeholder')}
                    value={inviteCode}
                    maxLength={10}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                    className="text-center text-lg font-mono tracking-widest uppercase"
                    autoFocus
                  />
                )}
                {error && (
                  <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}
                <Button
                  className="w-full"
                  disabled={popoverMode === 'create' ? creating || createName.trim().length === 0 : joining || inviteCode.trim().length === 0}
                  onClick={popoverMode === 'create' ? handleCreate : handleJoin}
                >
                  {popoverMode === 'create'
                    ? creating ? t('lists.creating') : t('lists.create')
                    : joining ? t('lists.joining') : t('lists.join')}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {error && !popoverOpen && (
          <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-sm text-rose-300 max-w-lg">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && lists.length === 0 && (
          <div className="grid gap-4 md:grid-cols-2 max-w-2xl">
            <button
              onClick={() => openPopover('create')}
              className="group text-left rounded-2xl bg-gradient-to-br from-emerald-600/20 to-emerald-600/5 border border-emerald-500/20 p-6 hover:border-emerald-500/40 hover:scale-[1.02] transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('lists.empty.createFirst')}</h3>
              <p className="text-neutral-400 text-sm">{t('lists.empty.createDesc')}</p>
            </button>
            <button
              onClick={() => openPopover('join')}
              className="group text-left rounded-2xl bg-gradient-to-br from-blue-600/20 to-blue-600/5 border border-blue-500/20 p-6 hover:border-blue-500/40 hover:scale-[1.02] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-blue-400" fill="currentColor">
                  <path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('lists.empty.orJoin')}</h3>
              <p className="text-neutral-400 text-sm">{t('lists.empty.joinDesc')}</p>
            </button>
          </div>
        )}

        {/* Main content: lists + activity feed */}
        {(loading || lists.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">

            {/* Lists column */}
            <ul className="space-y-3">
              {loading
                ? [0, 1, 2].map((i) => <SkeletonListItem key={i} />)
                : lists.map((list) => {
                    const rt = list.last_activity_at ? relativeTime(list.last_activity_at) : null
                    const lastActivityStr = rt
                      ? rt.isJustNow
                        ? t('lists.justNow')
                        : t('lists.lastActivity', { time: rt.value })
                      : null

                    return (
                      <li
                        key={list.id}
                        className="group rounded-xl border border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07] transition-all p-4 sm:p-5 shadow-lg shadow-black/20 hover:-translate-y-0.5"
                      >
                        <div className="flex items-start gap-4">
                          {/* Poster stack */}
                          <div className="hidden sm:block pt-0.5">
                            <PosterStack urls={list.poster_urls} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-base font-semibold tracking-tight truncate">{list.name}</span>
                              {list.your_role === 'owner' ? (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/10 border border-white/10 text-amber-300" title="Owner">
                                  <Crown className="w-3 h-3" />
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/10 border border-white/10 text-blue-300" title="Participant">
                                  <User className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                            {list.description && (
                              <p className="text-xs text-neutral-400 line-clamp-1">{list.description}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-300">
                              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/10 px-2 py-0.5">
                                {t('lists.counts.movies')}: {list.movie_count}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/10 px-2 py-0.5">
                                {t('lists.counts.participants')}: {list.member_count}
                              </span>
                            </div>
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <MemberAvatars members={list.members} />
                                {lastActivityStr && (
                                  <span className="text-[11px] text-neutral-500">{lastActivityStr}</span>
                                )}
                              </div>
                              {/* Action buttons */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Button
                                  variant="secondary"
                                  size="icon"
                                  className="w-8 h-8"
                                  onClick={() => handleCopy(list)}
                                  aria-label={copiedId === list.id ? t('lists.codeCopied') : t('lists.copyCode')}
                                  title={copiedId === list.id ? t('lists.codeCopied') : t('lists.copyCode')}
                                >
                                  {copiedId === list.id ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="icon"
                                  className="w-8 h-8"
                                  onClick={() => navigate(`/list/${list.id}`)}
                                  aria-label={t('lists.openList')}
                                  title={t('lists.openList')}
                                >
                                  <ArrowRight className="w-4 h-4" />
                                </Button>
                                {list.your_role === 'owner' && (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="w-8 h-8 border-rose-400/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300"
                                    onClick={() => setConfirmDelete(list)}
                                    aria-label={t('lists.deleteList')}
                                    title={t('lists.deleteList')}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                                {list.your_role === 'participant' && (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="w-8 h-8 border-amber-400/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300"
                                    onClick={() => setConfirmLeave(list)}
                                    aria-label={t('lists.leaveList')}
                                    title={t('lists.leaveList')}
                                  >
                                    <LogOut className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    )
                  })}
            </ul>

            {/* Activity feed */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 lg:sticky lg:top-6">
              <h3 className="text-sm font-semibold text-white/80 mb-3">{t('home.recentActivity')}</h3>
              {loading ? (
                <div className="space-y-3">
                  {[0, 1, 2, 4].map((i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <Skeleton className="w-8 h-11 rounded bg-white/10 shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-3/4 bg-white/10" />
                        <Skeleton className="h-3 w-1/2 bg-white/10" />
                        <Skeleton className="h-2 w-1/4 bg-white/10" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activity.length === 0 ? (
                <p className="text-xs text-neutral-500">{t('home.noActivity')}</p>
              ) : (
                <div>
                  {activity.map((item, i) => (
                    <ActivityFeedItem key={i} item={item} />
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* Dialogs */}
        <ConfirmDialog
          open={!!confirmDelete}
          onOpenChange={(open) => !open && setConfirmDelete(null)}
          title={t('lists.confirmDeleteTitle')}
          description={t('lists.confirmDeleteText', { name: confirmDelete?.name })}
          confirmText={t('misc.delete')}
          cancelText={t('misc.cancel')}
          onConfirm={handleConfirmDelete}
          isLoading={deleting}
          variant="destructive"
        />
        <ConfirmDialog
          open={!!confirmLeave}
          onOpenChange={(open) => !open && setConfirmLeave(null)}
          title={t('lists.confirmLeaveTitle')}
          description={t('lists.confirmLeaveText', { name: confirmLeave?.name })}
          confirmText={t('lists.leaveList')}
          cancelText={t('misc.cancel')}
          onConfirm={handleConfirmLeave}
          isLoading={leaving}
        />
      </main>
    </div>
  )
}
