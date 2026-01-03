import { useState } from 'react'
import { X, Film, Calendar, Languages, TrendingUp, Tv } from 'lucide-react'
import { StarRating } from './StarRating'
import { CommentSection } from './CommentSection'
import { UserAvatar } from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ListMovieUserEntryDTO, MovieStatus } from '@/services/lists'

interface MovieOverlayProps {
  isOpen: boolean
  onClose: () => void
  item: {
    movie_id: number
    status: MovieStatus
    rating?: number | null
    your_entry?: ListMovieUserEntryDTO | null
    user_entries: ListMovieUserEntryDTO[]
    average_rating?: number | null
    added_by_user?: { username: string; email: string; avatar_url?: string | null } | null
    added_at?: string
    watched_at?: string | null
    updated_at?: string
    movie: {
      title: string
      original_title?: string | null
      poster_path?: string | null
      poster_url?: string | null
      media_type: 'movie' | 'tv'
      release_date?: string | null
      overview?: string | null
      original_lang?: string | null
      popularity?: number | null
      seasons_count?: number | null
      episodes_count?: number | null
      series_status?: string | null
      genres?: Array<{ id: number; name: string }> | null
    }
  }
  listId: number
  currentUserId: number | null
  currentUserName: string | null
  currentUserAvatarUrl: string | null
  onChangeRating: (movieId: number, rating: number) => void
  updatingRating?: boolean
}

const statusConfig: Record<MovieStatus, { label: string; color: string }> = {
  not_watched: { label: 'Não Assistido', color: 'text-neutral-300' },
  watching: { label: 'Assistindo', color: 'text-sky-300' },
  watched: { label: 'Assistido', color: 'text-emerald-300' },
  dropped: { label: 'Abandonado', color: 'text-rose-300' },
}

export function MovieOverlay({
  isOpen,
  onClose,
  item,
  listId,
  currentUserId,
  currentUserName,
  currentUserAvatarUrl,
  onChangeRating,
  updatingRating,
}: MovieOverlayProps) {
  const [isClosing, setIsClosing] = useState(false)

  const media = item.movie
  const title = media.title
  const original = media.original_title && media.original_title !== media.title ? media.original_title : undefined
  const posterUrl = media.poster_url || (media.poster_path ? `https://image.tmdb.org/t/p/w500${media.poster_path}` : null)
  const userRatingValue = item.your_entry?.rating ?? item.rating ?? null
  const rating = typeof userRatingValue === 'number' ? userRatingValue : 0

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 200) // Match animation duration
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  if (!isOpen && !isClosing) return null

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-200",
        isClosing ? "opacity-0" : "opacity-100"
      )}
      onClick={handleBackdropClick}
    >
      <div
        className={cn(
          "relative w-full max-w-4xl max-h-[90vh] bg-gradient-to-br from-neutral-900 to-neutral-950 rounded-2xl border border-white/10 shadow-2xl overflow-hidden transition-all duration-200",
          isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"
        )}
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full h-10 w-10"
        >
          <X className="w-5 h-5" />
        </Button>

        {/* Scrollable content */}
        <div className="overflow-y-auto max-h-[90vh]">
          {/* Hero section with poster and basic info */}
          <div className="relative">
            {/* Background poster (blurred) */}
            {posterUrl && (
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={posterUrl}
                  alt=""
                  className="w-full h-full object-cover blur-2xl scale-110 opacity-30"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-neutral-900/50 via-neutral-900/80 to-neutral-900" />
              </div>
            )}

            {/* Content */}
            <div className="relative p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row gap-6">
                {/* Poster */}
                <div className="relative w-48 flex-shrink-0 mx-auto sm:mx-0">
                  {posterUrl ? (
                    <img
                      src={posterUrl}
                      alt={title}
                      className="w-full rounded-lg shadow-2xl aspect-[2/3] object-cover"
                    />
                  ) : (
                    <div className="w-full rounded-lg bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center aspect-[2/3]">
                      <Film className="w-16 h-16 text-neutral-600" />
                    </div>
                  )}
                </div>

                {/* Title and meta */}
                <div className="flex-1 space-y-4">
                  <div>
                    <div className="flex items-start gap-2 flex-wrap mb-2">
                      <h2 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-br from-white via-white to-neutral-400 bg-clip-text text-transparent">
                        {title}
                      </h2>
                      <span className={cn(
                        "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border font-medium",
                        "bg-white/5 border-white/10 text-neutral-300"
                      )}>
                        {media.media_type === 'movie' ? <Film className="w-3 h-3" /> : <Tv className="w-3 h-3" />}
                        {media.media_type === 'movie' ? 'Filme' : 'Série'}
                      </span>
                    </div>
                    {original && (
                      <p className="text-sm text-neutral-400 italic mb-3">
                        {original}
                      </p>
                    )}

                    {/* Status badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                      <span className={cn("text-sm font-medium", statusConfig[item.status].color)}>
                        {statusConfig[item.status].label}
                      </span>
                    </div>
                  </div>

                  {/* Release date */}
                  {media.release_date && (
                    <div className="flex items-center gap-2 text-sm text-neutral-300">
                      <Calendar className="w-4 h-4" />
                      {new Date(media.release_date).toLocaleDateString()}
                    </div>
                  )}

                  {/* Rating */}
                  <div className="space-y-2">
                    <p className="text-sm text-neutral-400">Sua avaliação:</p>
                    <StarRating
                      rating={rating}
                      onChange={(r) => onChangeRating(item.movie_id, r)}
                      size="lg"
                      disabled={!!updatingRating}
                    />
                    {updatingRating && (
                      <span className="text-xs text-neutral-500">Salvando…</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Details section */}
          <div className="px-6 sm:px-8 pb-8 space-y-6">
            {/* Overview */}
            {media.overview && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Sinopse</h3>
                <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-line">
                  {media.overview}
                </p>
              </div>
            )}

            {/* Meta info grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {media.original_lang && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-neutral-500 text-xs">
                    <Languages className="w-3.5 h-3.5" />
                    <span>Idioma</span>
                  </div>
                  <p className="text-sm text-neutral-200 font-medium">{media.original_lang.toUpperCase()}</p>
                </div>
              )}
              {media.popularity != null && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-neutral-500 text-xs">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Popularidade</span>
                  </div>
                  <p className="text-sm text-neutral-200 font-medium">{Math.round(media.popularity)}</p>
                </div>
              )}
              {media.media_type === 'tv' && media.seasons_count != null && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-neutral-500 text-xs">
                    <Tv className="w-3.5 h-3.5" />
                    <span>Temporadas</span>
                  </div>
                  <p className="text-sm text-neutral-200 font-medium">
                    {media.seasons_count}
                  </p>
                </div>
              )}
              {media.media_type === 'tv' && media.episodes_count != null && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-neutral-500 text-xs">
                    <Film className="w-3.5 h-3.5" />
                    <span>Episódios</span>
                  </div>
                  <p className="text-sm text-neutral-200 font-medium">
                    {media.episodes_count}
                  </p>
                </div>
              )}
            </div>

            {/* Genres */}
            {media.genres && media.genres.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Gêneros</h3>
                <div className="flex flex-wrap gap-2">
                  {media.genres.map((g) => (
                    <span
                      key={g.id}
                      className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-sm text-neutral-300"
                    >
                      {g.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Added by */}
            {item.added_by_user && (
              <div>
                <p className="text-sm text-neutral-400 mb-2">Adicionado por</p>
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                  <UserAvatar
                    avatarUrl={item.added_by_user.avatar_url}
                    name={item.added_by_user.username || item.added_by_user.email}
                    size="sm"
                  />
                  <span className="text-sm text-neutral-200">
                    {item.added_by_user.username || item.added_by_user.email}
                  </span>
                </div>
              </div>
            )}

            {/* Comments section */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Comentários</h3>
              <CommentSection
                listId={listId}
                movieId={item.movie_id}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                currentUserAvatarUrl={currentUserAvatarUrl}
                isOpen={isOpen}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
