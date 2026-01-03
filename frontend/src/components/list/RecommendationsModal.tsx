import { useState, useEffect, useCallback } from 'react'
import { Sparkles, Plus, Loader2, Star, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getListRecommendations, type RecommendationDTO, addListMovie } from '@/services/lists'

interface RecommendationsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  listId: number
  onMovieAdded?: () => void
}

// Skeleton loader component
function RecommendationSkeleton() {
  return (
    <div className="bg-neutral-900/50 rounded-lg overflow-hidden border border-white/5 animate-pulse">
      <div className="aspect-[2/3] bg-neutral-800/50" />
      <div className="p-2 space-y-2">
        <div className="h-4 bg-neutral-800/50 rounded w-3/4" />
        <div className="h-3 bg-neutral-800/50 rounded w-1/2" />
        <div className="flex items-center justify-between">
          <div className="h-3 bg-neutral-800/50 rounded w-1/4" />
          <div className="h-3 bg-neutral-800/50 rounded w-1/4" />
        </div>
      </div>
    </div>
  )
}

export function RecommendationsModal({ open, onOpenChange, listId, onMovieAdded }: RecommendationsModalProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<RecommendationDTO[]>([])
  const [error, setError] = useState<string | null>(null)
  const [addingMovieId, setAddingMovieId] = useState<number | null>(null)

  const fetchRecommendations = useCallback(async () => {
    if (!open) return

    setLoading(true)
    setError(null)

    try {
      const response = await getListRecommendations(listId, { limit: 12 })
      setRecommendations(response.recommendations)
    } catch (err: unknown) {
      console.error('Failed to fetch recommendations:', err)
      const errorObj = err as { error?: string; details?: string[] }
      if (errorObj.error && errorObj.error.includes('insuficientes')) {
        setError(t('recommendations.insufficientMovies'))
      } else {
        setError(t('recommendations.fetchError'))
      }
    } finally {
      setLoading(false)
    }
  }, [open, listId, t])

  useEffect(() => {
    if (open) {
      fetchRecommendations()
    }
  }, [open, fetchRecommendations])

  const handleAddToList = async (rec: RecommendationDTO) => {
    setAddingMovieId(rec.id)

    try {
      await addListMovie(listId, {
        id: String(rec.id),
        media_type: rec.media_type,
      })

      // Successfully added, refresh the list
      if (onMovieAdded) {
        onMovieAdded()
      }
    } catch (err: unknown) {
      console.error('Failed to add movie:', err)
      // Silently handle errors - user will see the error in the main list view if needed
    } finally {
      setAddingMovieId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeLabel={t('recommendations.close')}
        className="w-[95vw] max-w-7xl h-[90vh] overflow-y-auto bg-neutral-950 border border-white/10 p-0"
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-b from-neutral-950 via-neutral-950 to-neutral-950/95 pt-6 px-4 sm:px-6 pb-4 border-b border-white/10 z-10 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4 mb-1 sm:mb-2">
            <div className="flex-1">
              <h3 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500 animate-pulse" />
                {t('recommendations.title')}
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 mt-1 sm:mt-2">
                {t('recommendations.subtitle')}
              </p>
            </div>

            {/* Close button */}
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full hover:bg-white/10 flex-shrink-0"
                aria-label={t('recommendations.close')}
              >
                <X className="h-5 w-5 text-neutral-400 hover:text-white transition-colors" />
              </Button>
            </DialogClose>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 py-6">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <RecommendationSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12 sm:py-16">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 max-w-md mx-auto">
                <p className="text-neutral-200 mb-4">{error}</p>
                <Button
                  onClick={fetchRecommendations}
                  variant="outline"
                  className="gap-2 border-amber-500/50 hover:bg-amber-500/10"
                >
                  <Loader2 className="w-4 h-4" />
                  {t('recommendations.tryAgain')}
                </Button>
              </div>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-12 sm:py-16">
              <div className="max-w-md mx-auto">
                <Sparkles className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
                <p className="text-neutral-400 text-sm sm:text-base">{t('recommendations.empty')}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="group relative bg-neutral-900/50 rounded-lg overflow-hidden border border-white/5 hover:border-amber-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/10"
                >
                  {/* Poster */}
                  <div className="aspect-[2/3] relative overflow-hidden">
                    {rec.poster_url ? (
                      <img
                        src={rec.poster_url}
                        alt={rec.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/5 flex items-center justify-center">
                        <span className="text-xs text-neutral-500 text-center px-2">
                          {t('recommendations.noPoster')}
                        </span>
                      </div>
                    )}

                    {/* Score badge */}
                    <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      <span className="text-xs font-bold text-white">
                        {rec.score.toFixed(1)}
                      </span>
                    </div>

                    {/* Desktop: Hover overlay with add button */}
                    <div className="hidden sm:flex absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 items-end justify-center pb-4">
                      <Button
                        size="sm"
                        onClick={() => handleAddToList(rec)}
                        disabled={addingMovieId === rec.id}
                        className="gap-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300"
                      >
                        {addingMovieId === rec.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="hidden sm:inline">Adicionando...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">{t('recommendations.addToList')}</span>
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Mobile: Gradient overlay for readability */}
                    <div className="sm:hidden absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />
                  </div>

                  {/* Title and info */}
                  <div className="p-2 sm:p-3">
                    <h4 className="text-xs sm:text-sm font-semibold text-white line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem] mb-1">
                      {rec.title}
                    </h4>

                    {/* Overview - Desktop only */}
                    {rec.overview && (
                      <p className="hidden md:block text-xs text-neutral-400 line-clamp-2 mb-2">
                        {rec.overview}
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-neutral-500 bg-white/5 px-2 py-0.5 rounded">
                        {rec.media_type === 'tv' ? 'TV' : t('recommendations.movie')}
                      </span>

                      {/* Mobile: Add button */}
                      <Button
                        size="sm"
                        onClick={() => handleAddToList(rec)}
                        disabled={addingMovieId === rec.id}
                        className="sm:hidden gap-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold h-6 text-xs px-2"
                      >
                        {addingMovieId === rec.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Plus className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
