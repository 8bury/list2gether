import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header'
import { getListMovies, addListMovie, updateListMovie, deleteListMovie, getUserLists, getComments, createComment, updateComment, deleteComment, type ListMovieItemDTO, type ListMovieUserEntryDTO, type MovieStatus, type CommentDTO } from '../services/lists'
import { searchMedia, type SearchResultDTO } from '../services/search'

const statusLabels: Record<MovieStatus, string> = {
  not_watched: 'Não Assistido',
  watching: 'Assistindo',
  watched: 'Assistido',
  dropped: 'Abandonado',
}

const statusClasses: Record<MovieStatus, string> = {
  not_watched: 'bg-white/10 border-white/10 text-white',
  watching: 'bg-white/10 border-white/10 text-sky-300',
  watched: 'bg-white/10 border-white/10 text-emerald-300',
  dropped: 'bg-white/10 border-white/10 text-rose-300',
}

type ListMovieItem = ListMovieItemDTO & {
  user_entries: ListMovieUserEntryDTO[]
  your_entry?: ListMovieUserEntryDTO | null
  average_rating?: number | null
}

const computeAverageRating = (entries: ListMovieUserEntryDTO[]): number | null => {
  const ratings = entries
    .map((entry) => entry.rating)
    .filter((rating): rating is number => typeof rating === 'number' && !Number.isNaN(rating))
  if (ratings.length === 0) return null
  const sum = ratings.reduce((acc, value) => acc + value, 0)
  return sum / ratings.length
}

const getEntryDisplayName = (entry: ListMovieUserEntryDTO) =>
  entry.user?.username || entry.user?.email || `Usuário #${entry.user_id}`

const getCommentDisplayName = (comment: CommentDTO) =>
  comment.user?.username || comment.user?.email || `Usuário #${comment.user_id}`

const getRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  const diffWeek = Math.floor(diffDay / 7)
  const diffMonth = Math.floor(diffDay / 30)
  const diffYear = Math.floor(diffDay / 365)

  if (diffSec < 60) return 'agora mesmo'
  if (diffMin < 60) return `há ${diffMin} ${diffMin === 1 ? 'minuto' : 'minutos'}`
  if (diffHour < 24) return `há ${diffHour} ${diffHour === 1 ? 'hora' : 'horas'}`
  if (diffDay < 7) return `há ${diffDay} ${diffDay === 1 ? 'dia' : 'dias'}`
  if (diffWeek < 4) return `há ${diffWeek} ${diffWeek === 1 ? 'semana' : 'semanas'}`
  if (diffMonth < 12) return `há ${diffMonth} ${diffMonth === 1 ? 'mês' : 'meses'}`
  return `há ${diffYear} ${diffYear === 1 ? 'ano' : 'anos'}`
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function UserAvatar({ avatarUrl, name, size = 'sm' }: { avatarUrl?: string | null; name: string; size?: 'sm' | 'md' }) {
  const [imgError, setImgError] = useState(false)
  const initials = getInitials(name)
  const sizeClasses = size === 'sm' ? 'w-6 h-6 text-[9px]' : 'w-8 h-8 text-xs'
  
  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`${sizeClasses} rounded-full object-cover border border-white/20`}
      />
    )
  }
  
  return (
    <div className={`${sizeClasses} rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center font-bold text-white border border-white/20`}>
      {initials}
    </div>
  )
}

function StarIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={props.className} aria-hidden>
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.967 0 1.371 1.24.588 1.81l-2.802 2.036a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.802-2.036a1 1 0 00-1.175 0l-2.802 2.036c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.88 8.719c-.783-.57-.379-1.81.588-1.81H6.93a1 1 0 00.95-.69l1.07-3.292z" fill="currentColor" />
    </svg>
  )
}

function SkeletonCard() {
  return (
    <div className="group rounded-xl bg-white/5 border border-white/10 overflow-hidden transition-all shadow-lg shadow-white/10">
      <div className="flex animate-pulse">
        <div className="w-28 sm:w-32 bg-white/10 aspect-[2/3]"></div>
        <div className="p-3 sm:p-4 flex-1 grid gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Title */}
              <div className="h-5 sm:h-6 bg-white/10 rounded w-32 sm:w-48"></div>
              {/* Media type badge */}
              <div className="h-5 bg-white/10 rounded-full w-12"></div>
              {/* Status badge */}
              <div className="h-5 bg-white/10 rounded-full w-20"></div>
              {/* Rating badge */}
              <div className="h-5 bg-white/10 rounded-full w-16"></div>
              {/* Average rating badge */}
              <div className="h-5 bg-white/10 rounded-full w-20"></div>
              {/* Details button */}
              <div className="ml-auto h-5 bg-white/10 rounded-full w-16"></div>
            </div>
            <div className="mt-2 flex items-center gap-3">
              {/* Star rating */}
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="w-5 h-5 bg-white/10 rounded"></div>
                ))}
              </div>
              {/* Delete button */}
              <div className="w-8 h-8 bg-white/10 rounded-md border border-white/10"></div>
            </div>
            {/* Original title */}
            <div className="mt-2 h-3 bg-white/10 rounded w-40"></div>
          </div>
          {/* Release date */}
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <div className="h-3 bg-white/10 rounded w-28"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SkeletonHeader() {
  return (
    <div className="mb-4 grid gap-3 animate-pulse">
      {/* Top row: back button, title, add button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Back button */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white/10 border border-white/10"></div>
          {/* List title */}
          <div className="h-7 sm:h-9 bg-white/10 rounded w-40 sm:w-56"></div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {/* Add button */}
          <div className="flex-1 sm:flex-none h-10 bg-white/10 rounded-lg w-32 sm:w-36"></div>
        </div>
      </div>
      {/* Desktop: search + filter row */}
      <div className="hidden sm:grid sm:grid-cols-12 sm:items-start sm:gap-3">
        <div className="sm:col-span-7">
          {/* Search input */}
          <div className="h-10 bg-white/10 rounded-lg border border-white/10"></div>
        </div>
        <div className="sm:col-span-5">
          {/* Status filter */}
          <div className="h-10 bg-white/10 rounded-lg border border-white/10"></div>
        </div>
      </div>
      {/* Mobile: search + filter */}
      <div className="sm:hidden">
        <div className="h-10 bg-white/10 rounded-lg border border-white/10"></div>
        <div className="mt-2 h-10 bg-white/10 rounded-lg border border-white/10"></div>
      </div>
    </div>
  )
}

function MovieCard({ item, listId, currentUserId, currentUserName, currentUserAvatarUrl, onChangeRating, onChangeStatus, onDelete, updatingRating, updatingStatus, deleting }: {
  item: ListMovieItem
  listId: number
  currentUserId: number | null
  currentUserName: string | null
  currentUserAvatarUrl: string | null
  onChangeRating: (movieId: number, rating: number) => void
  onChangeStatus: (movieId: number, status: MovieStatus) => void
  onDelete: (movieId: number) => void
  updatingRating?: boolean
  updatingStatus?: boolean
  deleting?: boolean
}) {
  const media = item.movie
  const title = media.title
  const original = media.original_title && media.original_title !== media.title ? media.original_title : undefined
  const posterUrl = media.poster_url || (media.poster_path ? `https://image.tmdb.org/t/p/w500${media.poster_path}` : null)
  const userRatingValue = item.your_entry?.rating ?? item.rating ?? null
  const rating = typeof userRatingValue === 'number' ? userRatingValue : 0
  const fullCount = Math.floor(rating / 2)
  const hasHalf = rating % 2 === 1
  const averageRating = item.average_rating ?? computeAverageRating(item.user_entries)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [ratingsExpanded, setRatingsExpanded] = useState(false)
  const ratedEntries = item.user_entries.filter((e) => e.rating != null).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))

  // Comments state
  const [comments, setComments] = useState<CommentDTO[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsTotal, setCommentsTotal] = useState(0)
  const [commentInput, setCommentInput] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null)
  const commentsLoadedRef = useRef(false)

  // Load comments when details open
  useEffect(() => {
    if (detailsOpen && !commentsLoadedRef.current) {
      commentsLoadedRef.current = true
      setCommentsLoading(true)
      getComments(listId, item.movie_id, { limit: 50 })
        .then((res) => {
          setComments(res.comments)
          setCommentsTotal(res.pagination.total)
        })
        .catch(() => {})
        .finally(() => setCommentsLoading(false))
    }
  }, [detailsOpen, listId, item.movie_id])

  const handleSubmitComment = async () => {
    if (!commentInput.trim() || commentSubmitting) return
    setCommentSubmitting(true)
    try {
      const res = await createComment(listId, item.movie_id, commentInput.trim())
      setComments((prev) => [res.comment, ...prev])
      setCommentsTotal((prev) => prev + 1)
      setCommentInput('')
    } catch {}
    setCommentSubmitting(false)
  }

  const handleEditComment = async (commentId: number) => {
    if (!editingContent.trim() || commentSubmitting) return
    setCommentSubmitting(true)
    try {
      const res = await updateComment(listId, item.movie_id, commentId, editingContent.trim())
      setComments((prev) => prev.map((c) => (c.id === commentId ? res.comment : c)))
      setEditingCommentId(null)
      setEditingContent('')
    } catch {}
    setCommentSubmitting(false)
  }

  const handleDeleteComment = async (commentId: number) => {
    if (deletingCommentId) return
    setDeletingCommentId(commentId)
    try {
      await deleteComment(listId, item.movie_id, commentId)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
      setCommentsTotal((prev) => prev - 1)
    } catch {}
    setDeletingCommentId(null)
  }

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
    <div data-animate className="group rounded-xl bg-white/5 border border-white/10 overflow-hidden hover:border-white/20 hover:bg-white/10 transition-all shadow-lg shadow-white/10 hover:-translate-y-0.5">
      <div className="flex">
        {posterUrl ? (
          <img src={posterUrl} alt={title} className="w-28 sm:w-32 object-cover aspect-[2/3]" loading="lazy" />
        ) : (
          <div className="w-28 sm:w-32 bg-white/5 grid place-items-center text-neutral-400 text-xs">Sem poster</div>
        )}
        <div className="p-3 sm:p-4 flex-1 grid gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-semibold tracking-tight">{title}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full border border-white/10 text-gray-300">
                {media.media_type === 'movie' ? 'Filme' : 'Série'}
              </span>
              <div className="relative">
                <button
                  className={`text-xs px-2 py-0.5 rounded-full border ${statusClasses[item.status]} flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-white/40`}
                  onClick={() => setStatusOpen((v) => !v)}
                  disabled={!!updatingStatus}
                  aria-haspopup="listbox"
                  aria-expanded={statusOpen}
                >
                  {statusLabels[item.status]}
                  <svg className="w-3 h-3" viewBox="0 0 20 20" aria-hidden>
                    <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" fill="currentColor" />
                  </svg>
                </button>
                {statusOpen && (
                  <div className="absolute z-10 mt-1 min-w-[12rem] bg-neutral-950 border border-white/10 rounded-lg shadow-lg shadow-white/10">
                    {(['not_watched','watching','watched','dropped'] as MovieStatus[]).map((s) => (
                      <button
                        key={s}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-white/5 flex items-center gap-2 ${s === item.status ? 'bg-white/5' : ''}`}
                        onClick={() => { setStatusOpen(false); if (s !== item.status) onChangeStatus(item.movie_id, s) }}
                      >
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${statusClasses[s]}`}>{statusLabels[s]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {item.rating != null && (
                <span className="text-xs px-2 py-0.5 rounded-full border border-white/10 text-yellow-300">
                  Sua nota: {item.your_entry?.rating ?? item.rating}
                </span>
              )}
              {averageRating != null && (
                <span className="text-xs px-2 py-0.5 rounded-full border border-white/10 text-sky-200">
                  Nota média: {averageRating.toFixed(1)}
                </span>
              )}
              <button
                className="ml-auto text-xs px-2 py-0.5 rounded-full border border-white/10 text-neutral-300 hover:text-white hover:border-white/20 inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-white/40"
                onClick={() => setDetailsOpen((v) => !v)}
                aria-expanded={detailsOpen}
                title={detailsOpen ? 'Ocultar detalhes' : 'Mostrar detalhes'}
              >
                {detailsOpen ? 'Ocultar' : 'Detalhes'}
                {commentsTotal > 0 && !detailsOpen && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px]">{commentsTotal}</span>
                )}
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
                className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-white/10 hover:border-white/20 text-rose-300 hover:text-rose-200 focus:outline-none focus:ring-2 focus:ring-white/40"
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
          {ratedEntries.length > 0 && (
            <div className="border-t border-white/10 pt-2 mt-1">
              <button
                onClick={() => setRatingsExpanded((v) => !v)}
                className="flex items-center justify-between w-full text-xs text-neutral-400 hover:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-white/40 rounded px-1 py-0.5"
              >
                <span>
                  {ratedEntries.length} {ratedEntries.length !== 1 ? 'avaliações' : 'avaliação'}
                </span>
                <svg
                  className={`w-3 h-3 transition-transform ${ratingsExpanded ? 'rotate-180' : ''}`}
                  viewBox="0 0 20 20"
                  aria-hidden
                >
                  <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" fill="currentColor" />
                </svg>
              </button>
              {ratingsExpanded && (
                <div className="mt-2 space-y-2">
                  {ratedEntries.map((entry) => (
                    <div
                      key={entry.user_id}
                      className={`flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-white/5 border ${
                        item.your_entry && entry.user_id === item.your_entry.user_id
                          ? 'border-sky-300/40'
                          : 'border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          avatarUrl={entry.user?.avatar_url}
                          name={getEntryDisplayName(entry)}
                          size="sm"
                        />
                        <span className="text-neutral-200">{getEntryDisplayName(entry)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <StarIcon
                              key={i}
                              className={`w-3 h-3 ${
                                i < Math.floor((entry.rating ?? 0) / 2) ? 'text-yellow-400' : 'text-neutral-600'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-yellow-300 font-semibold w-6 text-right">{entry.rating}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className={`${detailsOpen ? 'block' : 'hidden'} border-t border-white/10 pt-3 mt-1`}>
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
                  <span key={g.id} className="px-2 py-0.5 rounded-full border border-white/10">{g.name}</span>
                ))}
              </div>
            )}
            {/* Comments Section */}
            <div className="mt-4 border-t border-white/10 pt-4">
              <h4 className="text-sm font-semibold text-neutral-100 mb-3 flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Comentários {commentsTotal > 0 && <span className="text-xs font-normal text-neutral-400">({commentsTotal})</span>}
              </h4>
              
              {/* New comment input */}
              <div className="flex gap-2 mb-4">
                <div className="flex-shrink-0">
                  <UserAvatar
                    avatarUrl={currentUserAvatarUrl}
                    name={currentUserName || '?'}
                    size="md"
                  />
                </div>
                <div className="flex-1">
                  <textarea
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="Escreva um comentário..."
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 outline-none focus:ring-2 focus:ring-white/40 text-sm resize-none"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        handleSubmitComment()
                      }
                    }}
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-neutral-500">Ctrl+Enter para enviar</span>
                    <button
                      onClick={handleSubmitComment}
                      disabled={!commentInput.trim() || commentSubmitting}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-black font-medium rounded-lg text-xs hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {commentSubmitting ? 'Enviando...' : 'Enviar'}
                      <svg viewBox="0 0 20 20" className="w-3 h-3" fill="currentColor">
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Comments list */}
              {commentsLoading ? (
                <div className="text-sm text-neutral-400 text-center py-4">Carregando comentários...</div>
              ) : comments.length === 0 ? (
                <div className="text-sm text-neutral-500 text-center py-4 italic">Nenhum comentário ainda. Seja o primeiro!</div>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-2">
                      <div className="flex-shrink-0">
                        <UserAvatar
                          avatarUrl={comment.user?.avatar_url}
                          name={getCommentDisplayName(comment)}
                          size="md"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-neutral-200">{getCommentDisplayName(comment)}</span>
                          <span className="text-[10px] text-neutral-500">{getRelativeTime(comment.created_at)}</span>
                          {comment.updated_at !== comment.created_at && (
                            <span className="text-[10px] text-neutral-600">(editado)</span>
                          )}
                        </div>
                        {editingCommentId === comment.id ? (
                          <div className="mt-1">
                            <textarea
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 outline-none focus:ring-2 focus:ring-white/40 text-sm resize-none"
                              rows={2}
                              autoFocus
                            />
                            <div className="mt-1 flex gap-2">
                              <button
                                onClick={() => handleEditComment(comment.id)}
                                disabled={!editingContent.trim() || commentSubmitting}
                                className="px-2 py-1 bg-white text-black font-medium rounded text-xs hover:bg-gray-100 disabled:opacity-50"
                              >
                                Salvar
                              </button>
                              <button
                                onClick={() => { setEditingCommentId(null); setEditingContent('') }}
                                className="px-2 py-1 bg-white/10 text-neutral-300 rounded text-xs hover:bg-white/20"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-neutral-300 mt-0.5 whitespace-pre-line break-words">{comment.content}</p>
                            {currentUserId === comment.user_id && (
                              <div className="mt-1 flex gap-2">
                                <button
                                  onClick={() => { setEditingCommentId(comment.id); setEditingContent(comment.content) }}
                                  className="text-[10px] text-neutral-500 hover:text-neutral-300"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleDeleteComment(comment.id)}
                                  disabled={deletingCommentId === comment.id}
                                  className="text-[10px] text-rose-400 hover:text-rose-300 disabled:opacity-50"
                                >
                                  {deletingCommentId === comment.id ? 'Excluindo...' : 'Excluir'}
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ListPage() {
  const navigate = useNavigate()
  const { listId } = useParams<{ listId: string }>()
  const parsedId = useMemo(() => Number(listId), [listId])
  const [items, setItems] = useState<ListMovieItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResultDTO[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const debounceRef = useRef<number | null>(null)
  const lastQueryRef = useRef<string>('')
  const abortRef = useRef<AbortController | null>(null)
  const [activeResultIndex, setActiveResultIndex] = useState<number>(0)
  const addInputRef = useRef<HTMLInputElement | null>(null)
  const resultsContainerRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [updatingRatingId, setUpdatingRatingId] = useState<number | null>(null)
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [listName, setListName] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<MovieStatus | 'all'>('all')
  const [genreFilter, setGenreFilter] = useState<string>('all')

  // State for in-list search
  const [listSearchQuery, setListSearchQuery] = useState('')

  const currentUserId = useMemo(() => {
    try {
      const raw = localStorage.getItem('user')
      if (!raw) return null
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed.id === 'number') {
        return parsed.id
      }
    } catch {
      // ignore parse errors
    }
    return null
  }, [])

  const currentUserName = useMemo(() => {
    try {
      const raw = localStorage.getItem('user')
      if (!raw) return null
      const parsed = JSON.parse(raw)
      return parsed?.username || parsed?.email || null
    } catch {
      return null
    }
  }, [])

  const currentUserAvatarUrl = useMemo(() => {
    try {
      const raw = localStorage.getItem('user')
      if (!raw) return null
      const parsed = JSON.parse(raw)
      return parsed?.avatar_url || null
    } catch {
      return null
    }
  }, [])

  const normalizeItem = useCallback(
    (item: ListMovieItemDTO): ListMovieItem => {
      const userEntries = item.user_entries ? [...item.user_entries] : []
      let yourEntry = item.your_entry ?? null
      if (!yourEntry && currentUserId != null) {
        yourEntry = userEntries.find((entry) => entry.user_id === currentUserId) ?? null
      }
      const averageRating = item.average_rating ?? computeAverageRating(userEntries)
      const derivedRating = yourEntry?.rating ?? item.rating ?? null
      return {
        ...item,
        rating: derivedRating ?? null,
        average_rating: averageRating ?? null,
        your_entry: yourEntry ?? null,
        user_entries: userEntries,
      }
    },
    [currentUserId],
  )

  const applyItems = useCallback(
    (list: ListMovieItemDTO[]) => {
      const normalized = list.map((entry) => normalizeItem(entry))
      setItems(normalized)
      return normalized
    },
    [normalizeItem],
  )

  // Persistir filtros e busca por lista
  useEffect(() => {
    const keyPrefix = `list:${parsedId || 'unknown'}`
    try {
      const savedStatus = localStorage.getItem(`${keyPrefix}:statusFilter`)
      const savedQuery = localStorage.getItem(`${keyPrefix}:listSearchQuery`)
      const savedGenre = localStorage.getItem(`${keyPrefix}:genreFilter`)
      if (savedStatus === 'all' || savedStatus === 'not_watched' || savedStatus === 'watching' || savedStatus === 'watched' || savedStatus === 'dropped') {
        setStatusFilter(savedStatus as MovieStatus | 'all')
      }
      if (savedQuery) setListSearchQuery(savedQuery)
      if (savedGenre) setGenreFilter(savedGenre)
    } catch {}
  }, [parsedId])

  useEffect(() => {
    const keyPrefix = `list:${parsedId || 'unknown'}`
    try {
      localStorage.setItem(`${keyPrefix}:statusFilter`, String(statusFilter))
      localStorage.setItem(`${keyPrefix}:listSearchQuery`, listSearchQuery)
      localStorage.setItem(`${keyPrefix}:genreFilter`, genreFilter)
    } catch {}
  }, [parsedId, statusFilter, listSearchQuery, genreFilter])
  

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
        applyItems(res)
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
  }, [navigate, parsedId, applyItems])

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

  // Client-side filter and search
  const filteredItems = useMemo(() => {
    let base = items
    if (statusFilter !== 'all') {
      base = base.filter((it) => it.status === statusFilter)
    }
    if (genreFilter !== 'all') {
      const gid = Number(genreFilter)
      base = base.filter((it) => it.movie.genres?.some((g) => g.id === gid))
    }
    const q = listSearchQuery.trim().toLowerCase()
    if (q.length >= 2) {
      base = base.filter((it) => {
        const m = it.movie
        const title = (m.title || '').toLowerCase()
        const original = (m.original_title || '').toLowerCase()
        const matchesEntries = it.user_entries.some((entry) => {
          const combined = `${entry.user?.username ?? ''} ${entry.user?.email ?? ''} ${entry.rating ?? ''}`.toLowerCase()
          return combined.includes(q)
        })
        return title.includes(q) || original.includes(q) || matchesEntries
      })
    }
    return base
  }, [items, statusFilter, genreFilter, listSearchQuery])

  const statusCounts = useMemo(() => {
    const counts: Record<MovieStatus | 'all', number> = {
      all: items.length,
      not_watched: 0,
      watching: 0,
      watched: 0,
      dropped: 0,
    }
    for (const it of items) {
      counts[it.status]++
    }
    return counts
  }, [items])

  const availableGenres = useMemo(() => {
    const genreMap = new Map<number, { name: string; count: number }>()
    for (const it of items) {
      for (const g of it.movie.genres ?? []) {
        const existing = genreMap.get(g.id)
        if (existing) {
          existing.count++
        } else {
          genreMap.set(g.id, { name: g.name, count: 1 })
        }
      }
    }
    return Array.from(genreMap.entries())
      .map(([id, { name, count }]) => ({ id, name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [items])

  // Debounced add-modal search com cancelamento
  useEffect(() => {
    if (!isAddOpen) return
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    if (abortRef.current) {
      try { abortRef.current.abort() } catch {}
      abortRef.current = null
    }
    const q = searchQuery.trim()
    if (q.length < 2) {
      setSearchResults([])
      setSearchError(null)
      setSearchLoading(false)
      setActiveResultIndex(0)
      return
    }
    setSearchLoading(true)
    setSearchError(null)
    lastQueryRef.current = q
    debounceRef.current = window.setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const res = await searchMedia(q, controller.signal)
        if (lastQueryRef.current === q) {
          setSearchResults(res.results || [])
          setActiveResultIndex(0)
        }
      } catch (err) {
        if ((err as any)?.name === 'AbortError') return
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
    }, 250)
  }, [searchQuery, isAddOpen, navigate])

  // Foco automático no input quando abrir modal
  useEffect(() => {
    if (isAddOpen) {
      setTimeout(() => addInputRef.current?.focus(), 0)
    }
  }, [isAddOpen])

  // Manter item ativo visível ao navegar por teclado
  useEffect(() => {
    const el = itemRefs.current[activeResultIndex]
    if (el && resultsContainerRef.current) {
      el.scrollIntoView({ block: 'nearest' })
    }
  }, [activeResultIndex, searchResults])

  const handleAddSelect = async (sel: SearchResultDTO) => {
    if (!parsedId || Number.isNaN(parsedId)) return
    try {
      await addListMovie(parsedId, { id: String(sel.id), media_type: sel.media_type })
      const res = await getListMovies(parsedId)
      applyItems(res)
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
    const previousItems = items
    try {
      setItems((prev) =>
        prev.map((it) => {
          if (it.movie_id !== movieId) return it
          const nowIso = new Date().toISOString()
          let updatedEntries = [...it.user_entries]
          let updatedYourEntry: ListMovieUserEntryDTO | null = it.your_entry ? { ...it.your_entry } : null

          if (currentUserId != null) {
            const existingIndex = updatedEntries.findIndex((entry) => entry.user_id === currentUserId)
            if (existingIndex >= 0) {
              updatedYourEntry = { ...updatedEntries[existingIndex], rating: value, updated_at: nowIso }
              updatedEntries = updatedEntries.map((entry, idx) => (idx === existingIndex ? updatedYourEntry! : entry))
            } else {
              updatedYourEntry = {
                user_id: currentUserId,
                rating: value,
                created_at: updatedYourEntry?.created_at ?? nowIso,
                updated_at: nowIso,
                user: updatedYourEntry?.user,
              }
              updatedEntries = [...updatedEntries, updatedYourEntry]
            }
          } else if (updatedYourEntry) {
            updatedYourEntry = { ...updatedYourEntry, rating: value, updated_at: nowIso }
            const existingIndex = updatedEntries.findIndex((entry) => entry.user_id === updatedYourEntry!.user_id)
            if (existingIndex >= 0) {
              updatedEntries = updatedEntries.map((entry, idx) => (idx === existingIndex ? updatedYourEntry! : entry))
            }
          }

          const average = computeAverageRating(updatedEntries)
          const resultingEntry = updatedYourEntry ?? it.your_entry ?? null
          return {
            ...it,
            rating: value,
            your_entry: resultingEntry,
            user_entries: updatedEntries,
            average_rating: average ?? null,
          }
        }),
      )
      await updateListMovie(parsedId, movieId, { rating: value })
      const res = await getListMovies(parsedId)
      applyItems(res)
    } catch (err) {
      setItems(previousItems)
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
    const previousItems = items
    try {
      setItems((prev) => prev.map((it) => it.movie_id === movieId ? { ...it, status } : it))
      await updateListMovie(parsedId, movieId, { status })
      const res = await getListMovies(parsedId)
      applyItems(res)
    } catch (err) {
      setItems(previousItems)
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

  const handleDelete = async (movieId: number) => {
    if (!parsedId || Number.isNaN(parsedId)) return
    setDeletingId(movieId)
    const previousItems = items
    try {
      setItems((prev) => prev.filter((it) => it.movie_id !== movieId))
      await deleteListMovie(parsedId, movieId)
      const res = await getListMovies(parsedId)
      applyItems(res)
    } catch (err) {
      setItems(previousItems)
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

  const effectiveItems = filteredItems
  const existingIds = useMemo(() => new Set(items.map((it) => it.movie_id)), [items])
  const displayResults = searchResults

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <>
            <SkeletonHeader />
            <div className="grid gap-3 sm:gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => navigate('/home')}
                    className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 transition focus:outline-none focus:ring-2 focus:ring-white/40"
                    aria-label="Voltar para suas listas"
                    title="Voltar"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden>
                      <path d="M19 11H8.41l4.3-4.29-1.42-1.42L4.59 12l6.7 6.71 1.42-1.42L8.41 13H19v-2z" />
                    </svg>
                  </button>
                  <svg viewBox="0 0 24 24" className="w-6 h-6 sm:w-7 sm:h-7 text-white/80 flex-shrink-0" fill="currentColor" aria-hidden>
                    <path d="M7 3a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM13 3a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM2 8h16v11c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V8zm16 2.5v7l4 2.5v-12l-4 2.5z"/>
                  </svg>
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex-1 min-w-0 truncate bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">{listName || `Lista #${parsedId}`}</h2>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button className="flex-1 sm:flex-none inline-block px-5 py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40" onClick={() => setIsAddOpen(true)}>Adicionar título</button>
                </div>
              </div>
              <div className="hidden sm:grid sm:grid-cols-12 sm:items-start sm:gap-3">
                <div className="sm:col-span-5">
                  <div className="relative">
                    <input
                      value={listSearchQuery}
                      onChange={(e) => setListSearchQuery(e.target.value)}
                      placeholder="Buscar nesta lista"
                      className="w-full pl-3 pr-9 py-2 rounded-lg bg-white/5 border border-white/10 outline-none focus:ring-2 focus:ring-white/40"
                    />
                    {listSearchQuery && (
                      <button
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white"
                        onClick={() => setListSearchQuery('')}
                        aria-label="Limpar busca"
                      >
                        <svg viewBox="0 0 20 20" className="w-4 h-4" aria-hidden>
                          <path d="M6.28 6.22a.75.75 0 011.06 0L10 8.88l2.66-2.66a.75.75 0 111.06 1.06L11.06 9.94l2.66 2.66a.75.75 0 11-1.06 1.06L10 11l-2.66 2.66a.75.75 0 11-1.06-1.06L8.94 9.94 6.28 7.28a.75.75 0 010-1.06z" fill="currentColor" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                <div className="sm:col-span-4">
                  <label className="sr-only" htmlFor="statusFilterSelect">Filtrar por status</label>
                  <div className="relative">
                    <select
                      id="statusFilterSelect"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as MovieStatus | 'all')}
                      className="w-full appearance-none pl-3 pr-9 py-2 rounded-lg bg-neutral-900 border border-neutral-700 outline-none focus:ring-2 focus:ring-white/40 text-sm"
                    >
                      <option value="all" className="bg-neutral-900 text-white">Todos ({statusCounts.all})</option>
                      <option value="not_watched" className="bg-neutral-900 text-white">Não Assistido ({statusCounts.not_watched})</option>
                      <option value="watching" className="bg-neutral-900 text-white">Assistindo ({statusCounts.watching})</option>
                      <option value="watched" className="bg-neutral-900 text-white">Assistido ({statusCounts.watched})</option>
                      <option value="dropped" className="bg-neutral-900 text-white">Abandonado ({statusCounts.dropped})</option>
                    </select>
                    <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-300">
                      <svg viewBox="0 0 20 20" className="w-4 h-4" aria-hidden>
                        <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" fill="currentColor" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="sm:col-span-3">
                  <label className="sr-only" htmlFor="genreFilterSelect">Filtrar por gênero</label>
                  <div className="relative">
                    <select
                      id="genreFilterSelect"
                      value={genreFilter}
                      onChange={(e) => setGenreFilter(e.target.value)}
                      className="w-full appearance-none pl-3 pr-9 py-2 rounded-lg bg-neutral-900 border border-neutral-700 outline-none focus:ring-2 focus:ring-white/40 text-sm"
                    >
                      <option value="all" className="bg-neutral-900 text-white">Todos os gêneros</option>
                      {availableGenres.map((g) => (
                        <option key={g.id} value={String(g.id)} className="bg-neutral-900 text-white">{g.name} ({g.count})</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-300">
                      <svg viewBox="0 0 20 20" className="w-4 h-4" aria-hidden>
                        <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" fill="currentColor" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="sm:hidden mb-3">
              <div className="relative">
                <input
                  value={listSearchQuery}
                  onChange={(e) => setListSearchQuery(e.target.value)}
                  placeholder="Buscar nesta lista"
                  className="w-full pl-3 pr-9 py-2 rounded-lg bg-white/5 border border-white/10 outline-none focus:ring-2 focus:ring-white/40"
                />
                {listSearchQuery && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white"
                    onClick={() => setListSearchQuery('')}
                    aria-label="Limpar busca"
                  >
                    <svg viewBox="0 0 20 20" className="w-4 h-4" aria-hidden>
                      <path d="M6.28 6.22a.75.75 0 011.06 0L10 8.88l2.66-2.66a.75.75 0 111.06 1.06L11.06 9.94l2.66 2.66a.75.75 0 11-1.06 1.06L10 11l-2.66 2.66a.75.75 0 11-1.06-1.06L8.94 9.94 6.28 7.28a.75.75 0 010-1.06z" fill="currentColor" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="sr-only" htmlFor="statusFilterSelectMobile">Filtrar por status</label>
                  <div className="relative">
                    <select
                      id="statusFilterSelectMobile"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as MovieStatus | 'all')}
                      className="w-full appearance-none pl-3 pr-9 py-2 rounded-lg bg-neutral-900 border border-neutral-700 outline-none focus:ring-2 focus:ring-white/40 text-sm"
                    >
                      <option value="all" className="bg-neutral-900 text-white">Todos ({statusCounts.all})</option>
                      <option value="not_watched" className="bg-neutral-900 text-white">Não Assistido ({statusCounts.not_watched})</option>
                      <option value="watching" className="bg-neutral-900 text-white">Assistindo ({statusCounts.watching})</option>
                      <option value="watched" className="bg-neutral-900 text-white">Assistido ({statusCounts.watched})</option>
                      <option value="dropped" className="bg-neutral-900 text-white">Abandonado ({statusCounts.dropped})</option>
                    </select>
                    <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-300">
                      <svg viewBox="0 0 20 20" className="w-4 h-4" aria-hidden>
                        <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" fill="currentColor" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="sr-only" htmlFor="genreFilterSelectMobile">Filtrar por gênero</label>
                  <div className="relative">
                    <select
                      id="genreFilterSelectMobile"
                      value={genreFilter}
                      onChange={(e) => setGenreFilter(e.target.value)}
                      className="w-full appearance-none pl-3 pr-9 py-2 rounded-lg bg-neutral-900 border border-neutral-700 outline-none focus:ring-2 focus:ring-white/40 text-sm"
                    >
                      <option value="all" className="bg-neutral-900 text-white">Todos os gêneros</option>
                      {availableGenres.map((g) => (
                        <option key={g.id} value={String(g.id)} className="bg-neutral-900 text-white">{g.name} ({g.count})</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-300">
                      <svg viewBox="0 0 20 20" className="w-4 h-4" aria-hidden>
                        <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" fill="currentColor" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {error && <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-sm text-rose-300 max-w-lg">{error}</div>}
            
            {!error && (
              <div className="grid gap-3 sm:gap-4">
                {effectiveItems.length === 0 ? (
                  <div className="rounded-xl bg-white/5 border border-white/10 p-6 text-center grid place-items-center">
                    <div className="text-gray-300">Nenhum título {listSearchQuery.trim().length >= 2 ? 'encontrado para a busca.' : 'nesta lista ainda.'}</div>
                    <div className="mt-4">
                      <button className="inline-block px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40" onClick={() => setIsAddOpen(true)}>Adicionar primeiro título</button>
                    </div>
                  </div>
                ) : (
                  effectiveItems.map((item) => (
                    <MovieCard
                      key={item.id}
                      item={item}
                      listId={parsedId}
                      currentUserId={currentUserId}
                      currentUserName={currentUserName}
                      currentUserAvatarUrl={currentUserAvatarUrl}
                      onChangeRating={handleChangeRating}
                      onChangeStatus={handleChangeStatus}
                      onDelete={handleDelete}
                      updatingRating={updatingRatingId === item.movie_id}
                      updatingStatus={updatingStatusId === item.movie_id}
                      deleting={deletingId === item.movie_id}
                    />
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>
      {isAddOpen && (
        <div className="fixed inset-0 z-50">
          <button className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-label="Fechar" onClick={() => { setIsAddOpen(false); setSearchQuery(''); setSearchResults([]); setSearchError(null) }}></button>
          <div className="relative z-10 h-full w-full p-4 grid place-items-center">
            <div className="w-full max-w-xl max-h-[80vh] bg-neutral-950 border border-white/10 rounded-2xl overflow-hidden shadow-lg shadow-white/10">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Adicionar título</h3>
                <button className="text-neutral-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40 rounded px-2 py-1" onClick={() => { setIsAddOpen(false); setSearchQuery(''); setSearchResults([]); setSearchError(null) }}>Fechar</button>
              </div>
              <div className="p-4 grid gap-3">
                <div className="grid grid-cols-1 gap-2 items-center">
                  <div>
                    <div className="relative">
                      <input
                        ref={addInputRef}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (!displayResults.length) return
                          if (e.key === 'ArrowDown') {
                            e.preventDefault()
                            setActiveResultIndex((i) => Math.min(i + 1, displayResults.length - 1))
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault()
                            setActiveResultIndex((i) => Math.max(i - 1, 0))
                          } else if (e.key === 'Enter') {
                            const sel = displayResults[activeResultIndex]
                            if (sel && !existingIds.has(sel.id)) {
                              handleAddSelect(sel)
                            }
                          } else if (e.key === 'Escape') {
                            setIsAddOpen(false)
                          }
                        }}
                        placeholder="Busque por um filme ou série"
                        className="w-full pl-3 pr-9 py-2 rounded-lg bg-white/5 border border-white/10 outline-none focus:ring-2 focus:ring-white/40"
                        role="combobox"
                        aria-expanded={displayResults.length > 0}
                        aria-controls="add-results"
                        aria-autocomplete="list"
                      />
                      {searchQuery && (
                        <button
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white"
                          onClick={() => setSearchQuery('')}
                          aria-label="Limpar busca"
                        >
                          <svg viewBox="0 0 20 20" className="w-4 h-4" aria-hidden>
                            <path d="M6.28 6.22a.75.75 0 011.06 0L10 8.88l2.66-2.66a.75.75 0 111.06 1.06L11.06 9.94l2.66 2.66a.75.75 0 11-1.06 1.06L10 11l-2.66 2.66a.75.75 0 11-1.06-1.06L8.94 9.94 6.28 7.28a.75.75 0 010-1.06z" fill="currentColor" />
                          </svg>
                        </button>
                      )}
                      {searchLoading && (
                        <div className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 text-gray-300" aria-hidden>
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {!searchLoading && searchQuery.trim().length < 2 && !searchError && (
                  <div className="text-sm text-neutral-400">Digite 2 ou mais caracteres para buscar.</div>
                )}
                {searchError && <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-sm text-rose-300">{searchError}</div>}
                {!searchLoading && searchQuery.trim().length >= 2 && displayResults.length === 0 && !searchError && (
                  <div className="text-neutral-400">Nenhum resultado.</div>
                )}
                <div
                  id="add-results"
                  ref={resultsContainerRef}
                  role="listbox"
                  aria-label="Resultados de busca"
                  className="grid gap-2 max-h-[46vh] overflow-y-auto pr-1"
                >
                  {displayResults.map((r, idx) => {
                    const isAdded = existingIds.has(r.id)
                    const isActive = idx === activeResultIndex
                    return (
                      <button
                        ref={(el) => { itemRefs.current[idx] = el }}
                        key={`${r.media_type}-${r.id}`}
                        role="option"
                        aria-selected={isActive}
                        className={`flex items-center gap-3 p-2 rounded-lg border text-left ${isActive ? 'border-white/20 bg-white/5' : 'border-white/10 hover:border-white/20 hover:bg-white/5'} ${isAdded ? 'opacity-70' : ''}`}
                        onClick={() => !isAdded && handleAddSelect(r)}
                        disabled={isAdded}
                      >
                        {r.poster_url ? (
                          <img src={r.poster_url} alt={r.name} className="w-12 h-16 object-cover rounded" loading="lazy" />
                        ) : (
                          <div className="w-12 h-16 bg-white/5 rounded grid place-items-center text-[10px] text-neutral-400">Sem poster</div>
                        )}
                        <div className="flex-1">
                          <div className="font-medium flex items-center gap-2">
                            <span className={`${isAdded ? 'text-gray-400 line-through' : ''}`}>{r.name}</span>
                            {isAdded && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-white/10 text-gray-300">Já na lista</span>
                            )}
                          </div>
                          {r.original_name && r.original_name !== r.name && (
                            <div className="text-xs text-neutral-400">{r.original_name}</div>
                          )}
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full border border-white/10 text-neutral-300">
                          {r.media_type === 'movie' ? 'Filme' : 'Série'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


