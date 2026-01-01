import { useCallback, useEffect, useRef, useState } from 'react'
import { X, RotateCcw } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface LuckySpinModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: Array<{
    movie_id: number
    movie: {
      title: string
      original_title?: string | null
      poster_path?: string | null
      poster_url?: string | null
      media_type: 'movie' | 'tv'
    }
  }>
}

export function LuckySpinModal({ open, onOpenChange, items }: LuckySpinModalProps) {
  const [isSpinning, setIsSpinning] = useState(false)
  const [selectedMovie, setSelectedMovie] = useState<any>(null)
  const [currentDisplayIndex, setCurrentDisplayIndex] = useState(0)
  const [spinItems, setSpinItems] = useState<any[]>([])
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
        clearTimeout(animationRef.current)
        animationRef.current = null
      }
    }
  }, [open])

  const startSpin = useCallback(() => {
    if (items.length === 0 || isSpinning) return

    // Select a random winner
    const winnerIndex = Math.floor(Math.random() * items.length)
    const winner = items[winnerIndex]

    // Create array of items for the animation (need at least 25 items before winner)
    const minItemsBefore = 25
    const itemsAfterWinner = 10
    let spinArray: any[] = []

    while (spinArray.length < minItemsBefore) {
      // Shuffle items to vary the order
      const shuffled = [...items].sort(() => Math.random() - 0.5)
      spinArray = spinArray.concat(shuffled)
    }

    // Add the winner at a specific position
    const winnerPosition = spinArray.length
    spinArray.push(winner)

    // Add more items after the winner to fill the modal
    let afterWinner: any[] = []
    while (afterWinner.length < itemsAfterWinner) {
      const shuffled = [...items].sort(() => Math.random() - 0.5)
      afterWinner = afterWinner.concat(shuffled)
    }
    spinArray = spinArray.concat(afterWinner.slice(0, itemsAfterWinner))

    setSpinItems(spinArray)
    setSelectedMovie(null)
    setCurrentDisplayIndex(0)
    setIsSpinning(true)

    // Animation with gradual slowdown
    const totalDuration = 3500 // ms
    let currentIndex = 0
    let elapsed = 0
    const baseInterval = 50 // fast initial interval

    const animateNames = () => {
      if (currentIndex >= winnerPosition) {
        // Reached the winner - stop
        setCurrentDisplayIndex(winnerPosition)
        setSelectedMovie(winner)
        setIsSpinning(false)
        return
      }

      // Calculate delay with exponential deceleration
      const progress = elapsed / totalDuration
      const delay = baseInterval + (progress * progress * 300)

      animationRef.current = window.setTimeout(() => {
        currentIndex++
        elapsed += delay
        setCurrentDisplayIndex(currentIndex)
        animateNames()
      }, delay)
    }

    animateNames()
  }, [items, isSpinning])

  const getPosterUrl = (item: any) => {
    return item?.movie?.poster_url ||
      (item?.movie?.poster_path ? `https://image.tmdb.org/t/p/w500${item.movie.poster_path}` : null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-neutral-950 border border-white/10">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7.5 3c.83 0 1.5.67 1.5 1.5S12.33 9 11.5 9 10 8.33 10 7.5 10.67 6 11.5 6zM8.5 9C7.67 9 7 8.33 7 7.5S7.67 6 8.5 6 10 6.67 10 7.5 9.33 9 8.5 9zM12 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3.5-6c-.83 0-1.5-.67-1.5-1.5S14.67 6 15.5 6s1.5.67 1.5 1.5S16.33 9 15.5 9zm-7 9c-.83 0-1.5-.67-1.5-1.5S7.67 15 8.5 15s1.5.67 1.5 1.5S9.33 18 8.5 18zm3 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm3 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
            </svg>
            {isSpinning ? 'Sorteando...' : 'Estou com Sorte'}
          </h3>
          <button
            className="text-neutral-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40 rounded p-1"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Slot Machine Container */}
        <div className="p-6">
          {items.length === 0 ? (
            <div className="py-12 text-center text-neutral-400">
              Nenhum filme não assistido disponível
            </div>
          ) : spinItems.length === 0 ? (
            // Initial state - show spin button
            <div className="py-12 text-center">
              <p className="text-neutral-400 mb-6">
                Escolha um filme aleatório da sua lista de não assistidos
              </p>
              <Button
                onClick={startSpin}
                size="lg"
                className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7.5 3c.83 0 1.5.67 1.5 1.5S12.33 9 11.5 9 10 8.33 10 7.5 10.67 6 11.5 6zM8.5 9C7.67 9 7 8.33 7 7.5S7.67 6 8.5 6 10 6.67 10 7.5 9.33 9 8.5 9zM12 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3.5-6c-.83 0-1.5-.67-1.5-1.5S14.67 6 15.5 6s1.5.67 1.5 1.5S16.33 9 15.5 9zm-7 9c-.83 0-1.5-.67-1.5-1.5S7.67 15 8.5 15s1.5.67 1.5 1.5S9.33 18 8.5 18zm3 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm3 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                </svg>
                Escolher para Mim
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
                    className="flex transition-transform ease-out"
                    style={{
                      transform: `translateX(calc(50% - ${currentDisplayIndex * 120 + 60}px))`,
                      transitionDuration: isSpinning ? '150ms' : '500ms',
                    }}
                  >
                    {spinItems.map((item, idx) => {
                      const posterUrl = getPosterUrl(item)
                      const isCenter = idx === currentDisplayIndex
                      return (
                        <div
                          key={`${item.movie_id}-${idx}`}
                          className={`flex-shrink-0 w-[120px] p-2 transition-all duration-150 ${
                            isCenter ? 'scale-105' : 'scale-95 opacity-60'
                          }`}
                        >
                          {posterUrl ? (
                            <img
                              src={posterUrl}
                              alt={item.movie.title}
                              className="w-full aspect-[2/3] object-cover rounded-lg shadow-lg"
                            />
                          ) : (
                            <div className="w-full aspect-[2/3] bg-white/5 rounded-lg grid place-items-center text-[10px] text-neutral-400">
                              Sem poster
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Movie name display */}
              <div className="mt-6 text-center min-h-[80px]">
                {spinItems.length > 0 && (
                  <div className={`transition-all duration-300 ${!isSpinning && selectedMovie ? 'scale-110' : ''}`}>
                    {!isSpinning && selectedMovie ? (
                      <>
                        <p className="text-sm text-neutral-400 mb-2">Você vai assistir:</p>
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
                    Sortear Novamente
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
