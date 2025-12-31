import { useEffect, useRef, useState } from 'react'
import { Sparkles, X, ExternalLink } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LuckySpinModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: Array<{
    movie_id: number
    movie: {
      title: string
      poster_path?: string | null
      poster_url?: string | null
      media_type: 'movie' | 'tv'
    }
  }>
}

export function LuckySpinModal({ open, onOpenChange, items }: LuckySpinModalProps) {
  const [spinning, setSpinning] = useState(false)
  const [selectedMovie, setSelectedMovie] = useState<any>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [spinItems, setSpinItems] = useState<any[]>([])
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (!open) {
      setSpinning(false)
      setSelectedMovie(null)
      setSpinItems([])
      setCurrentIndex(0)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [open])

  const startSpin = () => {
    if (items.length === 0 || spinning) return

    setSpinning(true)
    setSelectedMovie(null)

    // Create randomized list for spinning effect
    const shuffled = [...items].sort(() => Math.random() - 0.5)
    setSpinItems(shuffled)
    setCurrentIndex(0)

    let count = 0
    const totalSpins = 20 + Math.floor(Math.random() * 10) // 20-30 spins
    let currentDelay = 50 // Start fast

    const spin = () => {
      count++
      setCurrentIndex((prev) => (prev + 1) % shuffled.length)

      // Gradually slow down
      if (count > totalSpins * 0.7) {
        currentDelay += 20
      }

      if (count >= totalSpins) {
        // Stop spinning
        if (intervalRef.current) clearInterval(intervalRef.current)
        setSpinning(false)

        // Select final movie
        const finalIndex = Math.floor(Math.random() * shuffled.length)
        setSelectedMovie(shuffled[finalIndex])
        setCurrentIndex(finalIndex)
      } else {
        intervalRef.current = window.setTimeout(spin, currentDelay)
      }
    }

    intervalRef.current = window.setTimeout(spin, currentDelay)
  }

  const currentItem = spinItems[currentIndex]
  const posterUrl = currentItem?.movie.poster_url ||
    (currentItem?.movie.poster_path ? `https://image.tmdb.org/t/p/w500${currentItem.movie.poster_path}` : null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-gradient-to-br from-neutral-950 via-black to-neutral-950 border-2 border-white/20">
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 z-10 rounded-full p-2 bg-black/50 hover:bg-black/70 text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-8 text-center">
          {/* Title */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 mb-3">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-amber-300">Estou com Sorte</span>
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-br from-white via-neutral-200 to-neutral-500 bg-clip-text text-transparent">
              {selectedMovie ? 'Escolhido!' : spinning ? 'Selecionando...' : 'Escolha Aleatória'}
            </h2>
          </div>

          {/* Movie display */}
          {items.length === 0 ? (
            <div className="py-12 text-neutral-400">
              Nenhum filme não assistido disponível
            </div>
          ) : currentItem ? (
            <div className="space-y-6">
              {/* Poster with spinning effect */}
              <div className={cn(
                "relative mx-auto w-48 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl transition-all duration-300",
                spinning && "animate-pulse scale-105"
              )}>
                {posterUrl ? (
                  <img
                    src={posterUrl}
                    alt={currentItem.movie.title}
                    className={cn(
                      "w-full h-full object-cover transition-transform duration-200",
                      spinning && "scale-110"
                    )}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center">
                    <Sparkles className="w-16 h-16 text-neutral-600" />
                  </div>
                )}

                {/* Glow effect when selected */}
                {selectedMovie && (
                  <div className="absolute inset-0 bg-gradient-to-t from-amber-500/30 via-transparent to-transparent animate-pulse" />
                )}
              </div>

              {/* Title */}
              <div>
                <h3 className={cn(
                  "text-xl font-bold transition-all duration-300",
                  selectedMovie
                    ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-500 bg-clip-text text-transparent scale-110"
                    : "text-white"
                )}>
                  {currentItem.movie.title}
                </h3>
                <p className="text-sm text-neutral-400 mt-1">
                  {currentItem.movie.media_type === 'movie' ? 'Filme' : 'Série'}
                </p>
              </div>

              {/* Actions */}
              {!spinning && (
                <div className="flex gap-3 justify-center">
                  {selectedMovie ? (
                    <>
                      <Button
                        onClick={startSpin}
                        variant="outline"
                        className="gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        Tentar Novamente
                      </Button>
                      <Button
                        onClick={() => onOpenChange(false)}
                        className="gap-2"
                      >
                        Confirmar Escolha
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={startSpin}
                      size="lg"
                      className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold"
                    >
                      <Sparkles className="w-5 h-5" />
                      Escolher para Mim
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Button
              onClick={startSpin}
              disabled={spinning}
              size="lg"
              className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold"
            >
              <Sparkles className="w-5 h-5" />
              {spinning ? 'Escolhendo...' : 'Escolher para Mim'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
