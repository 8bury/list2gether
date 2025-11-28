import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { getUserLists, createList, joinList, deleteList, leaveList, type UserListDTO } from '../services/lists'
import { useTranslation } from 'react-i18next'

export default function HomePage() {
  const navigate = useNavigate()
  const [lists, setLists] = useState<UserListDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [joining, setJoining] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<UserListDTO | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState<UserListDTO | null>(null)
  const [leaving, setLeaving] = useState(false)
  
  // Popover state
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [popoverMode, setPopoverMode] = useState<'create' | 'join'>('create')
  const popoverRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  
  const { t } = useTranslation()

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverOpen &&
        popoverRef.current &&
        triggerRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setPopoverOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [popoverOpen])

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      navigate('/login')
      return
    }
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await getUserLists()
        setLists(res.lists)
      } catch (err) {
        const message = (err as any)?.payload?.error || (err as Error).message || 'Falha ao carregar listas'
        setError(message)
        if ((err as any)?.status === 401) {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('user')
          navigate('/login')
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [navigate])

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
      const message = (err as any)?.payload?.error || (err as Error).message || 'Falha ao excluir lista'
      setError(message)
      if ((err as any)?.status === 401) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        navigate('/login')
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
      const message = (err as any)?.payload?.error || (err as Error).message || 'Falha ao sair da lista'
      setError(message)
      if ((err as any)?.status === 401) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        navigate('/login')
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
      const message = (err as any)?.payload?.error || (err as Error).message
      setError(message)
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
      const message = (err as any)?.payload?.error || (err as Error).message
      setError(message)
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-5 gap-3">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">{t('lists.title')}</h2>
          
          {/* Popover trigger + container */}
          <div className="relative">
            <button
              ref={triggerRef}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
              onClick={() => {
                if (popoverOpen) {
                  setPopoverOpen(false)
                } else {
                  openPopover('create')
                }
              }}
            >
              <svg viewBox="0 0 24 24" className={`w-4 h-4 transition-transform duration-200 ${popoverOpen ? 'rotate-45' : ''}`} fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              {t('lists.new')}
            </button>
            
            {/* Popover */}
            {popoverOpen && (
              <div
                ref={popoverRef}
                className="absolute top-full right-0 mt-2 w-80 rounded-2xl bg-neutral-900 border border-white/10 shadow-2xl shadow-black/50 animate-in fade-in zoom-in-95 duration-200 origin-top-right z-50"
              >
                {/* Segmented control with sliding pill */}
                <div className="p-3 pb-0">
                  <div className="relative flex p-1 rounded-full bg-white/5">
                    {/* Sliding pill indicator */}
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
                      <div>
                        <input
                          className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 outline-none focus:ring-2 focus:ring-white/30 focus:border-white/20 transition-all placeholder:text-neutral-500"
                          placeholder={t('lists.namePlaceholder')}
                          value={createName}
                          onChange={(e) => setCreateName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                          autoFocus
                        />
                      </div>
                      <div>
                        <input
                          className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 outline-none focus:ring-2 focus:ring-white/30 focus:border-white/20 transition-all placeholder:text-neutral-500"
                          placeholder={t('lists.descriptionOptional')}
                          value={createDescription}
                          onChange={(e) => setCreateDescription(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <input
                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 outline-none focus:ring-2 focus:ring-white/30 focus:border-white/20 transition-all text-center text-lg font-mono tracking-widest uppercase placeholder:text-neutral-500 placeholder:normal-case placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
                        placeholder={t('lists.inviteCode.placeholder')}
                        value={inviteCode}
                        maxLength={10}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                        autoFocus
                      />
                    </div>
                  )}
                  
                  {error && (
                    <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                      {error}
                    </div>
                  )}
                  
                  <button
                    className="w-full py-2.5 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={
                      popoverMode === 'create'
                        ? creating || createName.trim().length === 0
                        : joining || inviteCode.trim().length === 0
                    }
                    onClick={popoverMode === 'create' ? handleCreate : handleJoin}
                  >
                    {popoverMode === 'create'
                      ? (creating ? t('lists.creating') : t('lists.create'))
                      : (joining ? t('lists.joining') : t('lists.join'))
                    }
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {loading && <div className="text-neutral-300">{t('misc.loading')}</div>}
        {error && !popoverOpen && <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-sm text-rose-300 max-w-lg mb-4">{error}</div>}
        
        {/* Empty state with clickable cards */}
        {!loading && lists.length === 0 && (
          <div className="grid gap-4 md:grid-cols-2 max-w-2xl">
            <button
              onClick={() => openPopover('create')}
              className="group text-left rounded-2xl bg-gradient-to-br from-emerald-600/20 to-emerald-600/5 border border-emerald-500/20 p-6 hover:border-emerald-500/40 hover:scale-[1.02] transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-emerald-400" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
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
                  <path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('lists.empty.orJoin')}</h3>
              <p className="text-neutral-400 text-sm">{t('lists.empty.joinDesc')}</p>
            </button>
          </div>
        )}
        
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
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/10 border border-white/10 text-amber-300" title="Owner" aria-label="Owner">
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor" aria-hidden="true">
                          <path d="M12 4l2.1 3.9 4.4.6-3.2 3.1.8 4.4L12 14.9 7.9 16l.8-4.4L5.5 8.5l4.4-.6L12 4z"/>
                        </svg>
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/10 border border-white/10 text-blue-300" title="Participant" aria-label="Participant">
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor" aria-hidden="true">
                          <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm-7 7a7 7 0 0 1 14 0H5z"/>
                        </svg>
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
                  <button
                    onClick={() => handleCopy(list)}
                    className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 transition focus:outline-none focus:ring-2 focus:ring-white/40"
                    aria-label={copiedId === list.id ? t('lists.codeCopied') : t('lists.copyCode')}
                    title={copiedId === list.id ? t('lists.codeCopied') : t('lists.copyCode')}
                  >
                    {copiedId === list.id ? (
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-emerald-300" fill="currentColor" aria-hidden="true">
                        <path d="M9 16.2l-3.5-3.5-1.4 1.4L9 19 20.3 7.7l-1.4-1.4z"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
                        <path d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12z"/>
                        <path d="M20 5H8a2 2 0 0 0-2 2v14h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h12z"/>
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => navigate(`/list/${list.id}`)}
                    className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 transition focus:outline-none focus:ring-2 focus:ring-white/40"
                    aria-label={t('lists.openList')}
                    title={t('lists.openList')}
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
                      <path d="M5 12h10.59l-4.3 4.29 1.42 1.42L20.41 12l-7.7-5.71-1.42 1.42L15.59 11H5z"/>
                    </svg>
                  </button>
                  {list.your_role === 'owner' && (
                    <button
                      onClick={() => setConfirmDelete(list)}
                      className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg border border-rose-400/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition focus:outline-none focus:ring-2 focus:ring-white/40"
                      aria-label={t('lists.deleteList')}
                      title={t('lists.deleteList')}
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
                        <path d="M6 7h12l-1 14H7L6 7zm10-3h-4l-1-1H9L8 4H4v2h16V4z"/>
                      </svg>
                    </button>
                  )}
                  {list.your_role === 'participant' && (
                    <button
                      onClick={() => setConfirmLeave(list)}
                      className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg border border-amber-400/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition focus:outline-none focus:ring-2 focus:ring-white/40"
                      aria-label={t('lists.leaveList')}
                      title={t('lists.leaveList')}
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
                        <path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5a2 2 0 00-2 2v4h2V5h14v14H5v-4H3v4a2 2 0 002 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950 p-5 shadow-lg shadow-white/10">
              <h3 className="text-lg font-semibold mb-2">{t('lists.confirmDeleteTitle')}</h3>
              <p className="text-neutral-300 mb-4">
                {t('lists.confirmDeleteText', { name: confirmDelete.name })}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  className="px-5 py-2.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 border border-white/10"
                  onClick={() => setConfirmDelete(null)}
                  disabled={deleting}
                >
                  {t('misc.cancel')}
                </button>
                <button
                  className="px-5 py-2.5 rounded-lg bg-rose-600 text-white hover:bg-rose-500 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 border border-rose-500"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                >
                  {deleting ? t('misc.deleting') : t('misc.delete')}
                </button>
              </div>
            </div>
          </div>
        )}
        {confirmLeave && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950 p-5 shadow-lg shadow-white/10">
              <h3 className="text-lg font-semibold mb-2">{t('lists.confirmLeaveTitle')}</h3>
              <p className="text-neutral-300 mb-4">
                {t('lists.confirmLeaveText', { name: confirmLeave.name })}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  className="px-5 py-2.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 border border-white/10"
                  onClick={() => setConfirmLeave(null)}
                  disabled={leaving}
                >
                  {t('misc.cancel')}
                </button>
                <button
                  className="px-5 py-2.5 rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 border border-amber-500"
                  onClick={handleConfirmLeave}
                  disabled={leaving}
                >
                  {leaving ? t('lists.leaving') : t('lists.leaveList')}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
