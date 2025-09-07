import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header'
import { getListMovies, type ListMovieItemDTO } from '../services/lists'

function MovieCard({ item }: { item: ListMovieItemDTO }) {
  const media = item.movie
  const title = media.title
  const original = media.original_title && media.original_title !== media.title ? media.original_title : undefined
  const posterUrl = media.poster_url || (media.poster_path ? `https://image.tmdb.org/t/p/w500${media.poster_path}` : null)

  return (
    <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-900/40 flex">
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
            <span className="text-xs px-2 py-0.5 rounded-full border border-neutral-700 text-neutral-300">
              {item.status}
            </span>
            {item.rating != null && (
              <span className="text-xs px-2 py-0.5 rounded-full border border-yellow-600 text-yellow-300">
                Nota: {item.rating}
              </span>
            )}
          </div>
          {original && <div className="text-xs text-neutral-400">Original: {original}</div>}
        </div>
        <div className="text-sm text-neutral-200 whitespace-pre-line">
          {media.overview || 'Sem descrição.'}
        </div>
        <div className="text-xs text-neutral-400 flex flex-wrap gap-x-3 gap-y-1">
          {media.release_date && <span>Lançamento: {new Date(media.release_date).toLocaleDateString()}</span>}
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
          <div className="text-xs text-neutral-300 flex flex-wrap gap-2">
            {media.genres.map((g) => (
              <span key={g.id} className="px-2 py-0.5 rounded-full border border-neutral-700">{g.name}</span>
            ))}
          </div>
        )}
        {item.notes && (
          <div className="text-sm text-neutral-200">
            <span className="text-neutral-400">Notas: </span>
            {item.notes}
          </div>
        )}
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

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Lista #{parsedId}</h2>
          <button className="border border-neutral-600 rounded-lg px-3 py-2 text-sm" onClick={() => navigate('/home')}>Voltar</button>
        </div>
        {loading && <div className="text-neutral-300">Carregando…</div>}
        {error && <div className="auth-error max-w-lg">{error}</div>}
        {!loading && !error && (
          <div className="grid gap-3 sm:gap-4">
            {items.length === 0 ? (
              <div className="text-neutral-300">Nenhum título nesta lista ainda.</div>
            ) : (
              items.map((item) => <MovieCard key={item.id} item={item} />)
            )}
          </div>
        )}
      </main>
    </div>
  )
}


