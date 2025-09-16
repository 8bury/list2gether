import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { getUserLists, createList, joinList, deleteList, type UserListDTO } from '../services/lists'

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
  const [showCreateInline, setShowCreateInline] = useState(false)
  const [showJoinInline, setShowJoinInline] = useState(false)

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

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-5 gap-3">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">Suas listas</h2>
          <div className="flex items-center gap-2">
            <button
              className="px-5 py-2.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 border border-white/10"
              onClick={() => {
                setError(null)
                setInviteCode('')
                setShowJoinInline((v) => !v)
              }}
            >
              Entrar por código
            </button>
            <button
              className="inline-block px-5 py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
              onClick={() => {
                setError(null)
                setCreateName('')
                setCreateDescription('')
                setShowCreateInline((v) => !v)
              }}
            >
              Nova lista
            </button>
          </div>
        </div>

        {showJoinInline && (
          <div className="mb-5 rounded-xl bg-white/5 border border-white/10 p-5">
            <h3 className="text-lg font-semibold mb-2">Entrar em lista por código</h3>
            <div className="grid gap-3 sm:flex sm:items-end sm:gap-3">
              <div className="flex-1 min-w-[240px]">
                <label className="block text-sm text-neutral-300 mb-1">Código de convite</label>
                <input
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 outline-none focus:ring-2 focus:ring-white/40"
                  placeholder="10 caracteres"
                  value={inviteCode}
                  maxLength={10}
                  onChange={(e) => setInviteCode(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  className="px-5 py-2.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 border border-white/10"
                  onClick={() => setShowJoinInline(false)}
                  disabled={joining}
                >
                  Cancelar
                </button>
                <button
                  className="inline-block px-5 py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
                  disabled={joining || inviteCode.trim().length === 0}
                  onClick={async () => {
                    if (!inviteCode.trim()) return
                    setJoining(true)
                    try {
                      const res = await joinList(inviteCode.trim())
                      setInviteCode('')
                      setShowJoinInline(false)
                      navigate(`/list/${res.list.id}`)
                    } catch (err) {
                      const message = (err as any)?.payload?.error || (err as Error).message
                      setError(message)
                    } finally {
                      setJoining(false)
                    }
                  }}
                >
                  {joining ? 'Entrando…' : 'Entrar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showCreateInline && (
          <div className="mb-5 rounded-xl bg-white/5 border border-white/10 p-5">
            <h3 className="text-lg font-semibold mb-2">Criar nova lista</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-neutral-300 mb-1">Nome</label>
                <input
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 outline-none focus:ring-2 focus:ring-white/40"
                  placeholder="Nome da lista"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-300 mb-1">Descrição (opcional)</label>
                <input
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 outline-none focus:ring-2 focus:ring-white/40"
                  placeholder="Descrição"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2">
                <button
                  className="px-5 py-2.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 border border-white/10"
                  onClick={() => setShowCreateInline(false)}
                  disabled={creating}
                >
                  Cancelar
                </button>
                <button
                  className="inline-block px-5 py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
                  disabled={creating || createName.trim().length === 0}
                  onClick={async () => {
                    if (!createName.trim()) return
                    setCreating(true)
                    try {
                      await createList({ name: createName.trim(), description: createDescription.trim() || undefined })
                      setCreateName('')
                      setCreateDescription('')
                      setShowCreateInline(false)
                      const res = await getUserLists()
                      setLists(res.lists)
                    } catch (err) {
                      const message = (err as any)?.payload?.error || (err as Error).message
                      setError(message)
                    } finally {
                      setCreating(false)
                    }
                  }}
                >
                  {creating ? 'Criando…' : 'Criar lista'}
                </button>
              </div>
            </div>
          </div>
        )}
        {loading && <div className="text-neutral-300">Carregando…</div>}
        {error && <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-sm text-rose-300 max-w-lg">{error}</div>}
        {!loading && !error && lists.length === 0 && (
          <div className="grid gap-4 max-w-2xl">
            <div className="rounded-xl bg-white/5 border border-white/10 p-5">
              <h3 className="text-lg font-semibold mb-2">Crie sua primeira lista</h3>
              <div className="grid gap-3">
                <input
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 outline-none focus:ring-2 focus:ring-white/40"
                  placeholder="Nome da lista"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                />
                <input
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 outline-none focus:ring-2 focus:ring-white/40"
                  placeholder="Descrição (opcional)"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                />
                <button
                  className="inline-block px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 w-fit"
                  disabled={creating || createName.trim().length === 0}
                  onClick={async () => {
                    if (!createName.trim()) return
                    setCreating(true)
                    try {
                      await createList({ name: createName.trim(), description: createDescription.trim() || undefined })
                      setCreateName('')
                      setCreateDescription('')
                      const res = await getUserLists()
                      setLists(res.lists)
                    } catch (err) {
                      const message = (err as any)?.payload?.error || (err as Error).message
                      setError(message)
                    } finally {
                      setCreating(false)
                    }
                  }}
                >
                  {creating ? 'Criando…' : 'Criar lista'}
                </button>
              </div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-5">
              <h3 className="text-lg font-semibold mb-2">Ou entre com um código</h3>
              <div className="grid gap-3">
                <input
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 outline-none focus:ring-2 focus:ring-white/40"
                  placeholder="Código de convite (10 caracteres)"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                />
                <button
                  className="px-6 py-3 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 border border-white/10 w-fit"
                  disabled={joining || inviteCode.trim().length === 0}
                  onClick={async () => {
                    if (!inviteCode.trim()) return
                    setJoining(true)
                    try {
                      const res = await joinList(inviteCode.trim())
                      setInviteCode('')
                      navigate(`/list/${res.list.id}`)
                    } catch (err) {
                      const message = (err as any)?.payload?.error || (err as Error).message
                      setError(message)
                    } finally {
                      setJoining(false)
                    }
                  }}
                >
                  {joining ? 'Entrando…' : 'Entrar na lista'}
                </button>
              </div>
            </div>
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
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/10 border border-white/10 text-amber-300" title="Proprietário" aria-label="Proprietário">
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor" aria-hidden="true">
                          <path d="M12 4l2.1 3.9 4.4.6-3.2 3.1.8 4.4L12 14.9 7.9 16l.8-4.4L5.5 8.5l4.4-.6L12 4z"/>
                        </svg>
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/10 border border-white/10 text-blue-300" title="Participante" aria-label="Participante">
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
                      Filmes: {list.movie_count}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/10 px-2 py-1">
                      Participantes: {list.member_count}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleCopy(list)}
                    className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 transition focus:outline-none focus:ring-2 focus:ring-white/40"
                    aria-label={copiedId === list.id ? 'Código copiado' : 'Copiar código de convite'}
                    title={copiedId === list.id ? 'Código copiado' : 'Copiar código'}
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
                    aria-label="Abrir lista"
                    title="Abrir lista"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
                      <path d="M5 12h10.59l-4.3 4.29 1.42 1.42L20.41 12l-7.7-5.71-1.42 1.42L15.59 11H5z"/>
                    </svg>
                  </button>
                  {list.your_role === 'owner' && (
                    <button
                      onClick={() => setConfirmDelete(list)}
                      className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg border border-rose-400/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition focus:outline-none focus:ring-2 focus:ring-white/40"
                      aria-label="Excluir lista"
                      title="Excluir lista"
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
                        <path d="M6 7h12l-1 14H7L6 7zm10-3h-4l-1-1H9L8 4H4v2h16V4z"/>
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
              <h3 className="text-lg font-semibold mb-2">Excluir lista?</h3>
              <p className="text-neutral-300 mb-4">
                Tem certeza de que deseja excluir a lista{' '}<span className="font-medium">"{confirmDelete.name}"</span>? Esta ação é irreversível.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  className="px-5 py-2.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 border border-white/10"
                  onClick={() => setConfirmDelete(null)}
                  disabled={deleting}
                >
                  Cancelar
                </button>
                <button
                  className="px-5 py-2.5 rounded-lg bg-rose-600 text-white hover:bg-rose-500 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 border border-rose-500"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Excluindo…' : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}


