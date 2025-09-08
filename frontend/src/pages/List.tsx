import { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header'
import { getListMovies, addListMovie, updateListMovie, deleteListMovie, getUserLists, type ListMovieItemDTO, type MovieStatus } from '../services/lists'
import { searchMedia, type SearchResultDTO } from '../services/search'

const statusLabels: Record<MovieStatus, string> = {
  not_watched: 'Não Assistido',
  watching: 'Assistindo',
  watched: 'Assistido',
  dropped: 'Abandonado',
}

const statusClasses: Record<MovieStatus, string> = {
  not_watched: 'bg-slate-900 border-slate-700 text-slate-200',
  watching: 'bg-sky-900/30 border-sky-700 text-sky-300',
  watched: 'bg-emerald-900/30 border-emerald-700 text-emerald-300',
  dropped: 'bg-rose-900/30 border-rose-700 text-rose-300',
}

function StarIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={props.className} aria-hidden>
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.967 0 1.371 1.24.588 1.81l-2.802 2.036a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.802-2.036a1 1 0 00-1.175 0l-2.802 2.036c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.88 8.719c-.783-.57-.379-1.81.588-1.81H6.93a1 1 0 00.95-.69l1.07-3.292z" fill="currentColor" />
    </svg>
  )
}

function MovieCard({ item, onChangeRating, onChangeStatus, onOpenNotes, onDelete, updatingRating, updatingStatus, deleting }: {
  item: ListMovieItemDTO
  onChangeRating: (movieId: number, rating: number) => void
  onChangeStatus: (movieId: number, status: MovieStatus) => void
  onOpenNotes: (item: ListMovieItemDTO) => void
  onDelete: (movieId: number) => void
  updatingRating?: boolean
  updatingStatus?: boolean
  deleting?: boolean
}) {
  const media = item.movie
  const title = media.title
  const original = media.original_title && media.original_title !== media.title ? media.original_title : undefined
  const posterUrl = media.poster_url || (media.poster_path ? `https://image.tmdb.org/t/p/w500${media.poster_path}` : null)
  const rating = item.rating ?? 0
  const fullCount = Math.floor(rating / 2)
  const hasHalf = rating % 2 === 1
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const handleClickRating = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    let ratio = (e.clientX - rect.left) / rect.width
    if (ratio < 0) ratio = 0
    if (ratio > 1) ratio = 1
    let value = Math.round(ratio * 10)
    if (value < 1) value = 1
    if (value > 10) value = 10
    onChangeRating(item.movie_id, value)
  }

  return (
    <div className="group border border-neutral-800 hover:border-neutral-700 rounded-xl overflow-hidden bg-neutral-900/40 hover:bg-neutral-900/60 transition-colors flex shadow-sm hover:shadow-md hover:shadow-black/30">
      {posterUrl ? (
        <img src={posterUrl} alt={title} className="w-28 sm:w-32 object-cover aspect-[2/3]" />
      ) : (
        <div className="w-28 sm:w-32 bg-neutral-800 grid place-items-center text-neutral-400 text-xs">Sem poster</div>
      )}
      <div className="p-3 sm:p-4 flex-1 grid gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base sm:text-lg font-semibold">{title}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full border border-neutral-700 text-neutral-300">
              {media.media_type === 'movie' ? 'Filme' : 'Série'}
            </span>
            <div className="relative">
              <button
                className={`text-xs px-2 py-0.5 rounded-full border ${statusClasses[item.status]} flex items-center gap-1`}
                onClick={() => setStatusOpen((v) => !v)}
                disabled={!!updatingStatus}
              >
                {statusLabels[item.status]}
                <svg className="w-3 h-3" viewBox="0 0 20 20" aria-hidden>
                  <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" fill="currentColor" />
                </svg>
              </button>
              {statusOpen && (
                <div className="absolute z-10 mt-1 min-w-[12rem] bg-neutral-950 border border-neutral-800 rounded-lg shadow-lg">
                  {(['not_watched','watching','watched','dropped'] as MovieStatus[]).map((s) => (
                    <button
                      key={s}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-900 flex items-center gap-2 ${s === item.status ? 'bg-neutral-900' : ''}`}
                      onClick={() => { setStatusOpen(false); if (s !== item.status) onChangeStatus(item.movie_id, s) }}
                    >
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${statusClasses[s]}`}>{statusLabels[s]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {item.rating != null && (
              <span className="text-xs px-2 py-0.5 rounded-full border border-yellow-600 text-yellow-300">
                Nota: {item.rating}
              </span>
            )}
            <button
              className="ml-auto text-xs px-2 py-0.5 rounded-full border border-neutral-700 hover:border-neutral-500 text-neutral-300 hover:text-white inline-flex items-center gap-1"
              onClick={() => setDetailsOpen((v) => !v)}
              aria-expanded={detailsOpen}
              title={detailsOpen ? 'Ocultar detalhes' : 'Mostrar detalhes'}
            >
              {detailsOpen ? 'Ocultar detalhes' : 'Detalhes'}
              <svg viewBox="0 0 20 20" className={`w-3 h-3 transition-transform ${detailsOpen ? 'rotate-180' : ''}`} aria-hidden>
                <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" fill="currentColor" />
              </svg>
            </button>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="select-none" ref={containerRef} onClick={handleClickRating} title="Avaliar">
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="relative w-5 h-5">
                    <StarIcon className="w-5 h-5 text-neutral-700" />
                    {i < fullCount && <StarIcon className="w-5 h-5 text-sky-400 absolute inset-0" />}
                    {i === fullCount && hasHalf && (
                      <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                        <StarIcon className="w-5 h-5 text-sky-400" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <button
              className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-rose-700 hover:border-rose-500 text-rose-300 hover:text-rose-200"
              onClick={() => onDelete(item.movie_id)}
              title="Remover"
              disabled={!!deleting}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
                <path d="M9 3a1 1 0 00-1 1v1H5.5a1 1 0 100 2H6v11a2 2 0 002 2h8a2 2 0 002-2V7h.5a1 1 0 100-2H16V4a1 1 0 00-1-1H9zm2 2h4v1h-4V5zm-1 4a1 1 0 112 0v8a1 1 0 11-2 0V9zm5 0a1 1 0 112 0v8a1 1 0 11-2 0V9z" fill="currentColor" />
              </svg>
            </button>
            {updatingRating && <span className="text-xs text-neutral-400">Salvando…</span>}
            {deleting && <span className="text-xs text-neutral-400">Removendo…</span>}
          </div>
          {original && <div className="text-xs text-neutral-400">Original: {original}</div>}
        </div>
        <div className="text-xs text-neutral-400 flex flex-wrap gap-x-3 gap-y-1">
          {media.release_date && <span>Lançamento: {new Date(media.release_date).toLocaleDateString()}</span>}
        </div>
        <div className={`${detailsOpen ? 'block' : 'hidden'} border-t border-neutral-800 pt-3 mt-1`}> 
          <div className="text-sm text-neutral-200 whitespace-pre-line">
            {media.overview || 'Sem descrição.'}
          </div>
          <div className="mt-2 text-xs text-neutral-400 flex flex-wrap gap-x-3 gap-y-1">
            {media.original_lang && <span>Idioma: {media.original_lang}</span>}
            {media.popularity != null && <span>Popularidade: {Math.round(media.popularity)}</span>}
            {media.media_type === 'tv' && media.seasons_count != null && (
              <span>Temporadas: {media.seasons_count}</span>
            )}
            {media.media_type === 'tv' && media.episodes_count != null && (
              <span>Episódios: {media.episodes_count}</span>
            )}
            {media.media_type === 'tv' && media.series_status && (
              <span>Status da série: {media.series_status}</span>
            )}
            {item.added_at && <span>Adicionado: {new Date(item.added_at).toLocaleString()}</span>}
            {item.watched_at && <span>Assistido: {new Date(item.watched_at).toLocaleString()}</span>}
            {item.updated_at && <span>Atualizado: {new Date(item.updated_at).toLocaleString()}</span>}
          </div>
          {media.genres && media.genres.length > 0 && (
            <div className="mt-2 text-xs text-neutral-300 flex flex-wrap gap-2">
              {media.genres.map((g) => (
                <span key={g.id} className="px-2 py-0.5 rounded-full border border-neutral-700">{g.name}</span>
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center justify-end gap-2">
            <button className="inline-flex items-center gap-1 rounded-md border border-neutral-700 hover:border-neutral-500 text-neutral-300 hover:text-white px-2 py-1 text-xs" onClick={() => onOpenNotes(item)} title="Anotações">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" aria-hidden>
                <path d="M6 4a2 2 0 00-2 2v12a2 2 0 002 2h7.5a2 2 0 001.414-.586l3.5-3.5A2 2 0 0019 14.5V6a2 2 0 00-2-2H6zm8 14.5V16a1 1 0 011-1h2.5L14 18.5zM7 8h10M7 11h10M7 14h6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Anotações</span>
            </button>
          </div>
          {item.notes && (
            <div className="mt-2 text-sm text-neutral-200">
              <span className="text-neutral-400">Notas: </span>
              {item.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ListPage() {
  const navigate = useNavigate()
  const { listId } = useParams<{ listId: string }>()
  const parsedId = useMemo(() => Number(listId), [listId])
  const [items, setItems] = useState<ListMovieItemDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResultDTO[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const debounceRef = useRef<number | null>(null)
  const lastQueryRef = useRef<string>('')
  const [updatingRatingId, setUpdatingRatingId] = useState<number | null>(null)
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null)
  const [notesItem, setNotesItem] = useState<ListMovieItemDTO | null>(null)
  const [notesEditing, setNotesEditing] = useState(false)
  const [notesDraft, setNotesDraft] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [listName, setListName] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      navigate('/login')
      return
    }
    if (!parsedId || Number.isNaN(parsedId)) {
      setError('ID da lista inválido')
      setLoading(false)
      return
    }
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await getListMovies(parsedId)
        setItems(res)
      } catch (err) {
        const message = (err as any)?.payload?.error || (err as Error).message || 'Falha ao carregar itens da lista'
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
  }, [navigate, parsedId])

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      navigate('/login')
      return
    }
    if (!parsedId || Number.isNaN(parsedId)) return
    ;(async () => {
      try {
        const res = await getUserLists({ limit: 100 })
        const found = res.lists.find((l) => l.id === parsedId)
        setListName(found ? found.name : null)
      } catch (err) {
        if ((err as any)?.status === 401) {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('user')
          navigate('/login')
        }
      }
    })()
  }, [navigate, parsedId])

  useEffect(() => {
    if (!isAddOpen) return
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    const q = searchQuery.trim()
    if (q.length < 2) {
      setSearchResults([])
      setSearchError(null)
      setSearchLoading(false)
      return
    }
    setSearchLoading(true)
    setSearchError(null)
    lastQueryRef.current = q
    debounceRef.current = window.setTimeout(async () => {
      try {
        const res = await searchMedia(q)
        if (lastQueryRef.current === q) {
          setSearchResults(res.results || [])
        }
      } catch (err) {
        const message = (err as any)?.payload?.error || (err as Error).message || 'Falha na pesquisa'
        setSearchError(message)
        if ((err as any)?.status === 401) {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('user')
          navigate('/login')
        }
      } finally {
        if (lastQueryRef.current === q) {
          setSearchLoading(false)
        }
      }
    }, 300)
  }, [searchQuery, isAddOpen, navigate])

  const handleAddSelect = async (sel: SearchResultDTO) => {
    if (!parsedId || Number.isNaN(parsedId)) return
    try {
      await addListMovie(parsedId, { id: String(sel.id), media_type: sel.media_type })
      const res = await getListMovies(parsedId)
      setItems(res)
      setIsAddOpen(false)
      setSearchQuery('')
      setSearchResults([])
    } catch (err) {
      const message = (err as any)?.payload?.error || (err as Error).message || 'Falha ao adicionar'
      setSearchError(message)
      if ((err as any)?.status === 401) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        navigate('/login')
      }
    }
  }

  const handleChangeRating = async (movieId: number, value: number) => {
    if (!parsedId || Number.isNaN(parsedId)) return
    setUpdatingRatingId(movieId)
    const old = items
    try {
      setItems((prev) => prev.map((it) => it.movie_id === movieId ? { ...it, rating: value } : it))
      await updateListMovie(parsedId, movieId, { rating: value })
    } catch (err) {
      setItems(old)
      const message = (err as any)?.payload?.error || (err as Error).message || 'Falha ao salvar nota'
      setError(message)
      if ((err as any)?.status === 401) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        navigate('/login')
      }
    } finally {
      setUpdatingRatingId(null)
    }
  }

  const handleChangeStatus = async (movieId: number, status: MovieStatus) => {
    if (!parsedId || Number.isNaN(parsedId)) return
    setUpdatingStatusId(movieId)
    const old = items
    try {
      setItems((prev) => prev.map((it) => it.movie_id === movieId ? { ...it, status } : it))
      await updateListMovie(parsedId, movieId, { status })
    } catch (err) {
      setItems(old)
      const message = (err as any)?.payload?.error || (err as Error).message || 'Falha ao salvar status'
      setError(message)
      if ((err as any)?.status === 401) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        navigate('/login')
      }
    } finally {
      setUpdatingStatusId(null)
    }
  }

  const openNotes = (it: ListMovieItemDTO) => {
    setNotesItem(it)
    setNotesEditing(false)
    setNotesDraft(it.notes || '')
  }

  const saveNotes = async () => {
    if (!parsedId || Number.isNaN(parsedId) || !notesItem) return
    try {
      await updateListMovie(parsedId, notesItem.movie_id, { notes: notesDraft })
      setItems((prev) => prev.map((it) => it.movie_id === notesItem.movie_id ? { ...it, notes: notesDraft } : it))
      setNotesEditing(false)
    } catch (err) {
      const message = (err as any)?.payload?.error || (err as Error).message || 'Falha ao salvar anotações'
      setError(message)
      if ((err as any)?.status === 401) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        navigate('/login')
      }
    }
  }

  const handleDelete = async (movieId: number) => {
    if (!parsedId || Number.isNaN(parsedId)) return
    setDeletingId(movieId)
    const old = items
    try {
      setItems((prev) => prev.filter((it) => it.movie_id !== movieId))
      await deleteListMovie(parsedId, movieId)
    } catch (err) {
      setItems(old)
      const message = (err as any)?.payload?.error || (err as Error).message || 'Falha ao remover'
      setError(message)
      if ((err as any)?.status === 401) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        navigate('/login')
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">{listName || `Lista #${parsedId}`}</h2>
          <div className="flex items-center gap-2">
            <button className="border border-sky-600 text-sky-300 rounded-lg px-3 py-2 text-sm" onClick={() => setIsAddOpen(true)}>Adicionar título</button>
            <button className="border border-neutral-600 rounded-lg px-3 py-2 text-sm" onClick={() => navigate('/home')}>Voltar</button>
          </div>
        </div>
        {loading && <div className="text-neutral-300">Carregando…</div>}
        {error && <div className="auth-error max-w-lg">{error}</div>}
        {!loading && !error && (
          <div className="grid gap-3 sm:gap-4">
            {items.length === 0 ? (
              <div className="text-neutral-300">Nenhum título nesta lista ainda.</div>
            ) : (
              items.map((item) => (
                <MovieCard
                  key={item.id}
                  item={item}
                  onChangeRating={handleChangeRating}
                  onChangeStatus={handleChangeStatus}
                  onOpenNotes={openNotes}
                  onDelete={handleDelete}
                  updatingRating={updatingRatingId === item.movie_id}
                  updatingStatus={updatingStatusId === item.movie_id}
                  deleting={deletingId === item.movie_id}
                />
              ))
            )}
          </div>
        )}
      </main>
      {notesItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm grid place-items-center p-4 z-50">
          <div className="w-full max-w-xl h-[420px] bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Anotações</h3>
              <button className="text-neutral-300 hover:text-white" onClick={() => { setNotesItem(null); setNotesEditing(false) }}>Fechar</button>
            </div>
            <div className="p-4 grid gap-3 flex-1 overflow-y-auto">
              {!notesEditing ? (
                <>
                  {notesItem.notes ? (
                    <div className="whitespace-pre-wrap text-sm text-neutral-200">{notesItem.notes}</div>
                  ) : (
                    <textarea
                      value={''}
                      readOnly
                      rows={6}
                      className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400"
                      placeholder="Sem anotações"
                    />
                  )}
                  <div className="flex justify-end">
                    <button
                      className="inline-flex items-center gap-1 rounded-md border border-neutral-700 hover:border-neutral-500 text-neutral-300 hover:text-white px-2 py-1 text-xs"
                      onClick={() => setNotesEditing(true)}
                      title="Editar anotações"
                    >
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" aria-hidden>
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.25H5v-.92l8.06-8.06.92.92L5.92 19.5zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor" />
                      </svg>
                      <span>Editar</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <textarea
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 outline-none focus:border-sky-600"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button className="border border-neutral-600 rounded-lg px-3 py-2 text-sm" onClick={() => { setNotesEditing(false); setNotesDraft(notesItem.notes || '') }}>Cancelar</button>
                    <button className="border border-sky-600 text-sky-300 rounded-lg px-3 py-2 text-sm" onClick={saveNotes}>Salvar</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm grid place-items-center p-4 z-50">
          <div className="w-full max-w-xl bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Adicionar título</h3>
              <button className="text-neutral-300 hover:text-white" onClick={() => { setIsAddOpen(false); setSearchQuery(''); setSearchResults([]); setSearchError(null) }}>Fechar</button>
            </div>
            <div className="p-4 grid gap-3">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Busque por um filme ou série"
                className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 outline-none focus:border-sky-600"
              />
              {searchError && <div className="auth-error">{searchError}</div>}
              {searchLoading && <div className="text-neutral-300">Pesquisando…</div>}
              {!searchLoading && searchQuery.trim().length >= 2 && searchResults.length === 0 && !searchError && (
                <div className="text-neutral-400">Nenhum resultado.</div>
              )}
              <div className="grid gap-2">
                {searchResults.map((r) => (
                  <button key={`${r.media_type}-${r.id}`} className="flex items-center gap-3 p-2 rounded-lg border border-neutral-800 hover:border-sky-700 hover:bg-neutral-900 text-left"
                    onClick={() => handleAddSelect(r)}>
                    {r.poster_url ? (
                      <img src={r.poster_url} alt={r.name} className="w-12 h-16 object-cover rounded" />
                    ) : (
                      <div className="w-12 h-16 bg-neutral-800 rounded grid place-items-center text-[10px] text-neutral-400">Sem poster</div>
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{r.name}</div>
                      {r.original_name && r.original_name !== r.name && (
                        <div className="text-xs text-neutral-400">{r.original_name}</div>
                      )}
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full border border-neutral-700 text-neutral-300">
                      {r.media_type === 'movie' ? 'Filme' : 'Série'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


