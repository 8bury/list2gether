import { ArrowLeft, Plus, Lightbulb } from 'lucide-react'
import { SearchInput } from '@/components/SearchInput'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { MovieStatus } from '@/services/lists'

interface ListHeaderProps {
  listName: string | null
  onBack: () => void
  onAddMovie: () => void
  onRecommendationsClick: () => void
  searchQuery: string
  onSearchChange: (value: string) => void
  statusFilter: MovieStatus | 'all'
  onStatusFilterChange: (value: MovieStatus | 'all') => void
  movieCount: number
}

export function ListHeader({
  listName,
  onBack,
  onAddMovie,
  onRecommendationsClick,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  movieCount
}: ListHeaderProps) {
  return (
    <div className="space-y-4 mb-6">
      {/* Top row: Back button, title, actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button
            variant="outline"
            size="icon"
            onClick={onBack}
            className="flex-shrink-0"
            title="Voltar"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-br from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent truncate">
            {listName || 'Lista'}
          </h1>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          {movieCount >= 2 && (
            <Button
              onClick={onRecommendationsClick}
              variant="outline"
              className="gap-2 bg-gradient-to-r from-purple-500/10 to-purple-600/5 border-purple-500/30 hover:from-purple-500/20 hover:to-purple-600/10 text-purple-300 hover:text-purple-200"
            >
              <Lightbulb className="w-4 h-4" />
              <span className="hidden sm:inline">Recomendações</span>
            </Button>
          )}

          <Button
            onClick={onAddMovie}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Adicionar</span>
          </Button>
        </div>
      </div>

      {/* Search & Filters row */}
      <div className="grid sm:grid-cols-12 gap-3">
        <div className="sm:col-span-7">
          <SearchInput
            value={searchQuery}
            onChange={onSearchChange}
            placeholder="Pesquisar na lista..."
            className="w-full"
          />
        </div>

        <div className="sm:col-span-5">
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-full bg-white/5 border-white/10 hover:bg-white/10">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="not_watched">Não Assistido</SelectItem>
              <SelectItem value="watching">Assistindo</SelectItem>
              <SelectItem value="watched">Assistido</SelectItem>
              <SelectItem value="dropped">Abandonado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
