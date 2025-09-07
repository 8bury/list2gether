import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { getUserLists, createList, joinList, type UserListDTO } from '../services/lists'

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

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-semibold mb-4">Suas listas</h2>
        {loading && <div className="text-neutral-300">Carregando…</div>}
        {error && <div className="auth-error max-w-lg">{error}</div>}
        {!loading && !error && lists.length === 0 && (
          <div className="grid gap-4 max-w-2xl">
            <div className="border border-neutral-800 rounded-xl p-5 bg-neutral-900/40">
              <h3 className="text-lg font-medium mb-2">Crie sua primeira lista</h3>
              <div className="grid gap-3">
                <input
                  className="auth-input"
                  placeholder="Nome da lista"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                />
                <input
                  className="auth-input"
                  placeholder="Descrição (opcional)"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                />
                <button
                  className="auth-button w-fit"
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
            <div className="border border-neutral-800 rounded-xl p-5 bg-neutral-900/40">
              <h3 className="text-lg font-medium mb-2">Ou entre com um código</h3>
              <div className="grid gap-3">
                <input
                  className="auth-input"
                  placeholder="Código de convite (10 caracteres)"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                />
                <button
                  className="auth-button w-fit"
                  disabled={joining || inviteCode.trim().length === 0}
                  onClick={async () => {
                    if (!inviteCode.trim()) return
                    setJoining(true)
                    try {
                      await joinList(inviteCode.trim())
                      setInviteCode('')
                      const res = await getUserLists()
                      setLists(res.lists)
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
            <li key={list.id} className="border border-neutral-800 rounded-xl p-4 bg-neutral-900/40">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-medium">{list.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full border border-neutral-700 text-neutral-300">{list.your_role}</span>
                  </div>
                  {list.description && <p className="text-neutral-300">{list.description}</p>}
                  <div className="text-xs text-neutral-400 flex flex-wrap gap-3">
                    <span>ID: {list.id}</span>
                    <span>Convite: {list.invite_code}</span>
                    <span>Membros: {list.member_count}</span>
                    <span>Títulos: {list.movie_count}</span>
                    <span>Criada: {new Date(list.created_at).toLocaleString()}</span>
                    <span>Atualizada: {new Date(list.updated_at).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0">
                  <button onClick={() => handleCopy(list)} className="bg-white text-black rounded-lg px-3 py-2 border border-white text-sm">
                    {copiedId === list.id ? 'Copiado!' : 'Copiar código'}
                  </button>
                  <button onClick={() => {}} className="border border-neutral-600 rounded-lg px-3 py-2 text-sm">
                    Entrar na lista
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}


