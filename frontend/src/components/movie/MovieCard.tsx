import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Trash2, Film, Tv, Users, Calendar, MessageSquare } from 'lucide-react'
import { StarRating } from './StarRating'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ListMovieUserEntryDTO, MovieStatus } from '@/services/lists'

interface MovieCardProps {
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
  onChangeRating: (movieId: number, rating: number) => void
  onChangeStatus: (movieId: number, status: MovieStatus) => void
  onDelete: (movieId: number) => void
  onOpenOverlay: (movieId: number) => void
  updatingRating?: boolean
  updatingStatus?: boolean
  deleting?: boolean
}

const statusConfig: Record<MovieStatus, { gradient: string; color: string }> = {
  not_watched: { color: 'text-neutral-300', gradient: 'from-neutral-500/20 to-neutral-600/10' },
  watching: { color: 'text-sky-300', gradient: 'from-sky-500/20 to-sky-600/10' },
  watched: { color: 'text-emerald-300', gradient: 'from-emerald-500/20 to-emerald-600/10' },
  dropped: { color: 'text-rose-300', gradient: 'from-rose-500/20 to-rose-600/10' },
}

function getPluralSuffix(count: number): 'one' | 'other' {
  return count === 1 ? 'one' : 'other'
}

export function MovieCard({ item, onChangeRating, onChangeStatus, onDelete, onOpenOverlay, updatingRating, updatingStatus, deleting }: MovieCardProps) {
  const { t } = useTranslation()
  const media = item.movie
  const title = media.title
  const original = media.original_title && media.original_title !== media.title ? media.original_title : undefined
  const posterUrl = media.poster_url || (media.poster_path ? `https://image.tmdb.org/t/p/w500${media.poster_path}` : null)
  const userRatingValue = item.your_entry?.rating ?? item.rating ?? null
  const rating = typeof userRatingValue === 'number' ? userRatingValue : 0

  const [statusOpen, setStatusOpen] = useState(false)

  const ratingsCount = item.user_entries.filter((e) => e.rating != null).length
  const notesCount = item.user_entries.filter((e) => e.notes && e.notes.trim() !== '').length

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't open overlay if clicking on interactive elements
    const target = e.target as HTMLElement
    if (
      target.closest('button') ||
      target.closest('[role="button"]') ||
      target.closest('input') ||
      target.closest('textarea')
    ) {
      return
    }
    onOpenOverlay(item.movie_id)
  }

  return (
    <div
      data-animate
      onClick={handleCardClick}
      className="group rounded-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 overflow-hidden hover:border-white/20 hover:from-white/10 hover:to-white/[0.05] transition-all duration-300 shadow-xl shadow-black/20 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/30 cursor-pointer"
    >
      <div className="flex">
        {/* Poster */}
        <div className="relative w-32 sm:w-36 flex-shrink-0">
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={title}
              className="w-full h-full object-cover aspect-[2/3]"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center aspect-[2/3]">
              <Film className="w-12 h-12 text-neutral-600" />
            </div>
          )}
          {/* Poster overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col gap-3">
          {/* Title & Badges */}
          <div className="space-y-2">
            <div className="flex items-start gap-2 flex-wrap">
              <h3 className="text-lg sm:text-xl font-bold tracking-tight bg-gradient-to-br from-white via-white to-neutral-400 bg-clip-text text-transparent flex-1">
                {title}
              </h3>
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Media type badge */}
                <span className={cn(
                  "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border font-medium",
                  "bg-white/5 border-white/10 text-neutral-300"
                )}>
                  {media.media_type === 'movie' ? <Film className="w-3 h-3" /> : <Tv className="w-3 h-3" />}
                  {t(`movieCard.mediaType.${media.media_type}`)}
                </span>

                {/* Status selector */}
                <div className="relative">
                  <button
                    onClick={() => setStatusOpen(!statusOpen)}
                    disabled={!!updatingStatus}
                    className={cn(
                      "inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium transition-all",
                      `bg-gradient-to-r ${statusConfig[item.status].gradient}`,
                      `border-white/20 ${statusConfig[item.status].color}`,
                      "hover:scale-105 active:scale-95",
                      updatingStatus && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {t(`status.${item.status}`)}
                    <ChevronDown className={cn("w-3 h-3 transition-transform", statusOpen && "rotate-180")} />
                  </button>

                  {statusOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setStatusOpen(false)} />
                      <div className="absolute right-0 z-20 mt-1 min-w-[160px] bg-neutral-950 border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
                        {(['not_watched', 'watching', 'watched', 'dropped'] as MovieStatus[]).map((s) => (
                          <button
                            key={s}
                            onClick={() => {
                              setStatusOpen(false)
                              if (s !== item.status) onChangeStatus(item.movie_id, s)
                            }}
                            className={cn(
                              "w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center gap-2",
                              s === item.status ? 'bg-white/10' : 'hover:bg-white/5',
                              statusConfig[s].color
                            )}
                          >
                            <span className={cn(
                              "w-2 h-2 rounded-full",
                              `bg-gradient-to-r ${statusConfig[s].gradient}`
                            )} />
                            {t(`status.${s}`)}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {original && (
              <p className="text-xs text-neutral-500 italic">
                {original}
              </p>
            )}
          </div>

          {/* Rating & Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <StarRating
              rating={rating}
              onChange={(r) => onChangeRating(item.movie_id, r)}
              size="md"
              disabled={!!updatingRating}
            />

            <Button
              variant="outline"
              size="icon"
              onClick={() => onDelete(item.movie_id)}
              disabled={!!deleting}
              className="border-rose-400/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 h-9 w-9"
              title={t('movieCard.remove')}
            >
              <Trash2 className="w-4 h-4" />
            </Button>

            {(updatingRating || deleting) && (
              <span className="text-xs text-neutral-500">
                {updatingRating ? t('movieCard.saving') : t('movieCard.removing')}
              </span>
            )}
          </div>

          {/* Release date */}
          {media.release_date && (
            <div className="flex items-center gap-1.5 text-xs text-neutral-400">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(media.release_date).toLocaleDateString()}
            </div>
          )}

          {/* Stats indicators */}
          {(ratingsCount > 0 || notesCount > 0) && (
            <div className="flex items-center gap-3 text-xs text-neutral-400">
              {ratingsCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {ratingsCount} {t(`movieCard.ratings_${getPluralSuffix(ratingsCount)}`)}
                </span>
              )}
              {notesCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {notesCount} {t(`movieCard.comments_${getPluralSuffix(notesCount)}`)}
                </span>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
