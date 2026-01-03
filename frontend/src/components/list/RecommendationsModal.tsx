import { useState, useEffect, useCallback } from 'react'
import { Sparkles, Plus, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getListRecommendations, type RecommendationDTO, addListMovie } from '@/services/lists'

interface RecommendationsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  listId: number
  onMovieAdded?: () => void
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
        className="sm:max-w-4xl max-h-[85vh] overflow-y-auto bg-neutral-950 border border-white/10"
      >
        {/* Header */}
        <div className="sticky top-0 bg-neutral-950 pb-4 border-b border-white/10 z-10">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            {t('recommendations.title')}
          </h3>
          <p className="text-sm text-neutral-400 mt-1">
            {t('recommendations.subtitle')}
          </p>
        </div>

        {/* Content */}
        <div className="pt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <span className="ml-3 text-neutral-400">{t('recommendations.loading')}</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-neutral-400">{error}</p>
              <Button
                onClick={fetchRecommendations}
                variant="outline"
                className="mt-4"
              >
                {t('recommendations.tryAgain')}
              </Button>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
              <p className="text-neutral-400">{t('recommendations.empty')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="group relative bg-neutral-900/50 rounded-lg overflow-hidden border border-white/5 hover:border-white/20 transition-all hover:scale-105"
                >
                  {/* Poster */}
                  <div className="aspect-[2/3] relative">
                    {rec.poster_url ? (
                      <img
                        src={rec.poster_url}
                        alt={rec.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/5 flex items-center justify-center">
                        <span className="text-xs text-neutral-500 text-center px-2">
                          {t('recommendations.noPoster')}
                        </span>
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        size="sm"
                        onClick={() => handleAddToList(rec)}
                        disabled={addingMovieId === rec.id}
                        className="gap-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                      >
                        {addingMovieId === rec.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                        {t('recommendations.addToList')}
                      </Button>
                    </div>
                  </div>

                  {/* Title and score */}
                  <div className="p-2">
                    <h4 className="text-sm font-medium text-white line-clamp-2 min-h-[2.5rem]">
                      {rec.title}
                    </h4>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-neutral-500">
                        {rec.media_type === 'tv' ? 'TV' : t('recommendations.movie')}
                      </span>
                      <span className="text-xs font-semibold text-amber-500">
                        {rec.score.toFixed(1)}
                      </span>
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
