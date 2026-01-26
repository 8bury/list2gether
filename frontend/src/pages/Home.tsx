import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Copy, Check, ArrowRight, Trash2, LogOut, Crown, User } from 'lucide-react'
import Header from '@/components/Header'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAuth } from '@/hooks'
import { getUserLists, createList, joinList, deleteList, leaveList, type UserListDTO } from '@/services/lists'
import type { ApiException } from '@/services/api'

export default function HomePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { requireAuth, clearAuth } = useAuth()

  const [lists, setLists] = useState<UserListDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)

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
    if (!requireAuth()) return

    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await getUserLists()
        setLists(res.lists)
      } catch (err) {
        const apiErr = err as ApiException
        const message = apiErr.payload?.error || apiErr.message || 'Falha ao carregar listas'
        setError(message)
        if (apiErr.status === 401) {
          clearAuth()
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [requireAuth, clearAuth])

  const handleCopy = async (list: UserListDTO) => {
    try {
      await navigator.clipboard.writeText(list.invite_code)
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
      if (apiErr.status === 401) {
        clearAuth()
      }
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
      if (apiErr.status === 401) {
        clearAuth()
      }
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
       if (apiErr.status === 401) {
         clearAuth()
       }
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
       if (apiErr.status === 401) {
         clearAuth()
       }
     } finally {
       setJoining(false)
     }
   }

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-5 gap-3">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
            {t('lists.title')}
          </h2>

          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                onClick={() => {
                  if (!popoverOpen) openPopover('create')
                }}
                className="gap-2"
              >
                <Plus className={`w-4 h-4 transition-transform duration-200 ${popoverOpen ? 'rotate-45' : ''}`} />
                {t('lists.new')}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              {/* Segmented control */}
              <div className="p-3 pb-0">
                <div className="relative flex p-1 rounded-full bg-white/5">
                  <div
                    className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-full shadow-lg transition-all duration-300 ease-out"
                    style={{
                      left: popoverMode === 'create' ? '4px' : 'calc(50% + 0px)',
                    }}
                  />
                  <button
                    className={`relative flex-1 py-2 text-sm font-medium rounded-full transition-colors duration-200 z-10 ${
                      popoverMode === 'create'
                        ? 'text-black'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                    onClick={() => {
                      setPopoverMode('create')
                      setError(null)
                    }}
                  >
                    {t('lists.popover.create')}
                  </button>
                  <button
                    className={`relative flex-1 py-2 text-sm font-medium rounded-full transition-colors duration-200 z-10 ${
                      popoverMode === 'join'
                        ? 'text-black'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                    onClick={() => {
                      setPopoverMode('join')
                      setError(null)
                    }}
                  >
                    {t('lists.popover.join')}
                  </button>
                </div>
              </div>

              {/* Form content */}
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
                  disabled={
                    popoverMode === 'create'
                      ? creating || createName.trim().length === 0
                      : joining || inviteCode.trim().length === 0
                  }
                  onClick={popoverMode === 'create' ? handleCreate : handleJoin}
                >
                  {popoverMode === 'create'
                    ? creating
                      ? t('lists.creating')
                      : t('lists.create')
                    : joining
                    ? t('lists.joining')
                    : t('lists.join')}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {loading && <div className="text-neutral-300">{t('misc.loading')}</div>}
        {error && !popoverOpen && (
          <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-sm text-rose-300 max-w-lg mb-4">
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

        {/* Lists */}
        <ul className="space-y-3">
          {lists.map((list) => (
            <li
              key={list.id}
              className="group rounded-xl border border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10 transition-all p-4 sm:p-5 shadow-lg shadow-white/10 hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold tracking-tight">{list.name}</span>
                    {list.your_role === 'owner' ? (
                      <span
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/10 border border-white/10 text-amber-300"
                        title="Owner"
                        aria-label="Owner"
                      >
                        <Crown className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/10 border border-white/10 text-blue-300"
                        title="Participant"
                        aria-label="Participant"
                      >
                        <User className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  {list.description && (
                    <p className="text-sm text-neutral-300 line-clamp-2">{list.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-200">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/10 px-2 py-1">
                      {t('lists.counts.movies')}: {list.movie_count}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/10 px-2 py-1">
                      {t('lists.counts.participants')}: {list.member_count}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => handleCopy(list)}
                    aria-label={copiedId === list.id ? t('lists.codeCopied') : t('lists.copyCode')}
                    title={copiedId === list.id ? t('lists.codeCopied') : t('lists.copyCode')}
                  >
                    {copiedId === list.id ? (
                      <Check className="w-5 h-5 text-emerald-300" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => navigate(`/list/${list.id}`)}
                    aria-label={t('lists.openList')}
                    title={t('lists.openList')}
                  >
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                  {list.your_role === 'owner' && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setConfirmDelete(list)}
                      className="border-rose-400/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300"
                      aria-label={t('lists.deleteList')}
                      title={t('lists.deleteList')}
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  )}
                  {list.your_role === 'participant' && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setConfirmLeave(list)}
                      className="border-amber-400/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300"
                      aria-label={t('lists.leaveList')}
                      title={t('lists.leaveList')}
                    >
                      <LogOut className="w-5 h-5" />
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Delete confirmation dialog */}
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

        {/* Leave confirmation dialog */}
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
