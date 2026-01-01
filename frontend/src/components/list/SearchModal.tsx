import { useState, useEffect, useRef } from 'react'
import { Search, Film, Tv, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { searchMedia, type SearchResultDTO } from '@/services/search'
import { cn } from '@/lib/utils'

interface SearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (result: SearchResultDTO) => Promise<void>
}

export function SearchModal({ open, onOpenChange, onSelect }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResultDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [adding, setAdding] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const lastQueryRef = useRef<string>('')

  // Debounced search
  useEffect(() => {
    const cleanup = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      if (abortRef.current) {
        abortRef.current.abort()
        abortRef.current = null
      }
    }

    if (!open) return cleanup

    cleanup()

    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setError(null)
      setLoading(false)
      return cleanup
    }

    setLoading(true)
    setError(null)
    lastQueryRef.current = q

    debounceRef.current = window.setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const res = await searchMedia(q, controller.signal)
        if (lastQueryRef.current === q) {
          setResults(res.results || [])
          setActiveIndex(0)
        }
      } catch (err) {
        if ((err as any)?.name === 'AbortError') return
        const message = (err as any)?.payload?.error || (err as Error).message || 'Falha na pesquisa'
        setError(message)
      } finally {
        if (lastQueryRef.current === q) {
          setLoading(false)
        }
      }
    }, 300)

    return cleanup
  }, [query, open])

  // Auto-focus input
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery('')
      setResults([])
      setError(null)
      setActiveIndex(0)
    }
  }, [open])

  const handleSelect = async (result: SearchResultDTO) => {
    setAdding(true)
    setError(null)
    try {
      await onSelect(result)
      onOpenChange(false)
    } catch (err) {
      const message = (err as any)?.payload?.error || (err as Error).message || 'Falha ao adicionar'
      setError(message)
    } finally {
      setAdding(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault()
      handleSelect(results[activeIndex])
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/10">
          <DialogTitle className="text-xl font-bold bg-gradient-to-br from-white to-neutral-400 bg-clip-text text-transparent">
            Adicionar Filme ou Série
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pesquisar filmes e séries..."
              className="pl-10 bg-white/5 border-white/10 focus:border-white/20"
            />
          </div>

          {error && (
            <div className="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-sm text-rose-300">
              {error}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading && (
            <div className="text-center py-12 text-neutral-400">
              Pesquisando...
            </div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="text-center py-12 text-neutral-500">
              Nenhum resultado encontrado
            </div>
          )}

          {!loading && query.length < 2 && (
            <div className="text-center py-12 text-neutral-500 italic">
              Digite pelo menos 2 caracteres para pesquisar
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((result, index) => {
                const posterUrl = result.poster_url

                return (
                  <button
                    key={`${result.media_type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    disabled={adding}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                      index === activeIndex
                        ? "bg-white/10 border-white/20"
                        : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20",
                      adding && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {/* Poster */}
                    <div className="w-12 h-16 flex-shrink-0 rounded overflow-hidden bg-neutral-800">
                      {posterUrl ? (
                        <img src={posterUrl} alt={result.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {result.media_type === 'movie' ? (
                            <Film className="w-5 h-5 text-neutral-600" />
                          ) : (
                            <Tv className="w-5 h-5 text-neutral-600" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm text-white truncate">
                          {result.name}
                        </h4>
                        <span className={cn(
                          "flex-shrink-0 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border font-medium",
                          "bg-white/5 border-white/10 text-neutral-400"
                        )}>
                          {result.media_type === 'movie' ? <Film className="w-2.5 h-2.5" /> : <Tv className="w-2.5 h-2.5" />}
                          {result.media_type === 'movie' ? 'Filme' : 'Série'}
                        </span>
                      </div>
                      {result.original_name && result.original_name !== result.name && (
                        <p className="text-xs text-neutral-500 truncate">
                          {result.original_name}
                        </p>
                      )}
                    </div>

                    {/* Add button */}
                    <Plus className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors flex-shrink-0" />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
