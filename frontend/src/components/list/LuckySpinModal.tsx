import { useCallback, useEffect, useRef, useState, useMemo, memo } from 'react'
import { RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { shuffle } from '@/lib/utils'

interface MovieItem {
  movie_id: number
  movie: {
    title: string
    original_title?: string | null
    poster_path?: string | null
    poster_url?: string | null
    media_type: 'movie' | 'tv'
  }
}

interface LuckySpinModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: MovieItem[]
}

// Memoized poster component to prevent unnecessary re-renders
interface PosterItemProps {
  posterUrl: string | null
  title: string
  isCenter: boolean
  noPosterText: string
}

const PosterItem = memo(({ posterUrl, title, isCenter, noPosterText }: PosterItemProps) => {
  return (
    <div
      className={`flex-shrink-0 w-[120px] p-2 transition-all duration-150 ${
        isCenter ? 'scale-105' : 'scale-95 opacity-60'
      }`}
    >
      {posterUrl ? (
        <img
          src={posterUrl}
          alt={title}
          className="w-full aspect-[2/3] object-cover rounded-lg shadow-lg"
          loading="lazy"
        />
      ) : (
        <div className="w-full aspect-[2/3] bg-white/5 rounded-lg grid place-items-center text-[10px] text-neutral-400">
          {noPosterText}
        </div>
      )}
    </div>
  )
})

PosterItem.displayName = 'PosterItem'

export function LuckySpinModal({ open, onOpenChange, items }: LuckySpinModalProps) {
  const { t } = useTranslation()
  const [isSpinning, setIsSpinning] = useState(false)
  const [selectedMovie, setSelectedMovie] = useState<MovieItem | null>(null)
  const [currentDisplayIndex, setCurrentDisplayIndex] = useState(0)
  const [spinItems, setSpinItems] = useState<MovieItem[]>([])
  const spinContainerRef = useRef<HTMLDivElement | null>(null)
  const animationRef = useRef<number | null>(null)

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setIsSpinning(false)
      setSelectedMovie(null)
      setSpinItems([])
      setCurrentDisplayIndex(0)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [open])

  const startSpin = useCallback(() => {
    if (items.length === 0 || isSpinning) return

    // Reset state
    setSelectedMovie(null)
    setIsSpinning(true)

    // Select random winner
    const winnerIndex = Math.floor(Math.random() * items.length)
    const winner = items[winnerIndex]

    // Build spin array: fill with random shuffled items (excluding winner), then place winner at the end
    const spinArray: MovieItem[] = []
    const itemsToShow = 20 // Number of items to show before winner

    // Shuffle items excluding the winner to avoid duplicates
    const itemsWithoutWinner = items.filter(item => item.movie_id !== winner.movie_id)
    const shuffled = shuffle([...itemsWithoutWinner])

    for (let i = 0; i < itemsToShow; i++) {
      spinArray.push(shuffled[i % shuffled.length])
    }

    // Add the winner at the end
    spinArray.push(winner)

    // Position where winner will be centered
    const finalPosition = spinArray.length - 1

    setSpinItems(spinArray)
    setCurrentDisplayIndex(0)

    // Animate using requestAnimationFrame
    const duration = 3000 // 3 seconds
    const startTime = performance.now()

    const animate = () => {
      const elapsed = performance.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      if (progress >= 1) {
        // Animation complete
        setCurrentDisplayIndex(finalPosition)
        setSelectedMovie(winner)
        setIsSpinning(false)
        animationRef.current = null
        return
      }

      // Cubic ease-out for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3)
      const currentIndex = Math.floor(eased * finalPosition)

      setCurrentDisplayIndex(currentIndex)
      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)
  }, [items, isSpinning])

  const getPosterUrl = useCallback((item: MovieItem) => {
    return item.movie.poster_url ||
      (item.movie.poster_path ? `https://image.tmdb.org/t/p/w500${item.movie.poster_path}` : null)
  }, [])

  // Memoize rendered posters to prevent unnecessary re-renders
  const renderedPosters = useMemo(() => {
    return spinItems.map((item: MovieItem, idx: number) => {
      const posterUrl = getPosterUrl(item)
      const isCenter = idx === currentDisplayIndex
      return (
        <PosterItem
          key={`${item.movie_id}-${idx}`}
          posterUrl={posterUrl}
          title={item.movie.title}
          isCenter={isCenter}
          noPosterText={t('lucky.noPoster')}
        />
      )
    })
  }, [spinItems, currentDisplayIndex, getPosterUrl, t])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t('lucky.close')} className="sm:max-w-2xl p-0 overflow-hidden bg-neutral-950 border border-white/10">
        {/* Header */}
        <div className="p-4 border-b border-white/10 bg-white/5">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7.5 3c.83 0 1.5.67 1.5 1.5S12.33 9 11.5 9 10 8.33 10 7.5 10.67 6 11.5 6zM8.5 9C7.67 9 7 8.33 7 7.5S7.67 6 8.5 6 10 6.67 10 7.5 9.33 9 8.5 9zM12 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3.5-6c-.83 0-1.5-.67-1.5-1.5S14.67 6 15.5 6s1.5.67 1.5 1.5S16.33 9 15.5 9zm-7 9c-.83 0-1.5-.67-1.5-1.5S7.67 15 8.5 15s1.5.67 1.5 1.5S9.33 18 8.5 18zm3 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm3 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
            </svg>
            {isSpinning ? t('lucky.spinning') : t('lucky.title')}
          </h3>
        </div>

        {/* Slot Machine Container */}
        <div className="p-6">
          {items.length === 0 ? (
            <div className="py-12 text-center text-neutral-400">
              {t('lucky.noMovies')}
            </div>
          ) : spinItems.length === 0 ? (
            // Initial state - show spin button
            <div className="py-12 text-center">
              <p className="text-neutral-400 mb-6">
                {t('lucky.description')}
              </p>
              <Button
                onClick={startSpin}
                size="lg"
                className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7.5 3c.83 0 1.5.67 1.5 1.5S12.33 9 11.5 9 10 8.33 10 7.5 10.67 6 11.5 6zM8.5 9C7.67 9 7 8.33 7 7.5S7.67 6 8.5 6 10 6.67 10 7.5 9.33 9 8.5 9zM12 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3.5-6c-.83 0-1.5-.67-1.5-1.5S14.67 6 15.5 6s1.5.67 1.5 1.5S16.33 9 15.5 9zm-7 9c-.83 0-1.5-.67-1.5-1.5S7.67 15 8.5 15s1.5.67 1.5 1.5S9.33 18 8.5 18zm3 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm3 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                </svg>
                {t('lucky.chooseForMe')}
              </Button>
            </div>
          ) : (
            <>
              {/* Slot window with gradient masks */}
              <div className="relative">
                {/* Gradient masks for slot effect */}
                <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-neutral-950 to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-neutral-950 to-transparent z-10 pointer-events-none" />

                {/* Center indicator */}
                <div className="absolute left-1/2 top-0 bottom-0 w-[120px] -translate-x-1/2 border-2 border-white/50 rounded-lg z-20 pointer-events-none">
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45" />
                </div>

                {/* Posters container */}
                <div
                  ref={spinContainerRef}
                  className="overflow-hidden rounded-lg bg-neutral-900/50 border border-white/5"
                >
                  <div
                    className="flex transition-transform ease-out will-change-transform"
                    style={{
                      transform: `translateX(calc(50% - ${currentDisplayIndex * 120 + 60}px))`,
                      transitionDuration: isSpinning ? '100ms' : '500ms',
                    }}
                  >
                    {renderedPosters}
                  </div>
                </div>
              </div>

              {/* Movie name display */}
              <div className="mt-6 text-center min-h-[80px]">
                {spinItems.length > 0 && (
                  <div className={`transition-all duration-300 ${!isSpinning && selectedMovie ? 'scale-110' : ''}`}>
                    {!isSpinning && selectedMovie ? (
                      <>
                        <p className="text-sm text-neutral-400 mb-2">{t('lucky.result')}</p>
                        <h4 className="text-2xl font-bold text-white">
                          {selectedMovie.movie.title}
                        </h4>
                        {selectedMovie.movie.original_title && selectedMovie.movie.original_title !== selectedMovie.movie.title && (
                          <p className="text-sm text-neutral-400 mt-1">{selectedMovie.movie.original_title}</p>
                        )}
                      </>
                    ) : (
                      <h4 className="text-xl font-semibold text-neutral-300 truncate px-4">
                        {spinItems[currentDisplayIndex]?.movie.title || '...'}
                      </h4>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-6 flex justify-center gap-3">
                {!isSpinning && selectedMovie && (
                  <Button
                    onClick={startSpin}
                    variant="outline"
                    className="gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {t('lucky.spinAgain')}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
