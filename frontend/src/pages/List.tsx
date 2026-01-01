import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Header from '@/components/Header'
import { MovieCard } from '@/components/movie/MovieCard'
import { ListHeader } from '@/components/list/ListHeader'
import { SearchModal } from '@/components/list/SearchModal'
import { LuckySpinModal } from '@/components/list/LuckySpinModal'
import { SkeletonCard } from '@/components/list/SkeletonCard'
import { SkeletonHeader } from '@/components/list/SkeletonHeader'
import { useAuth } from '@/hooks'
import {
  getListMovies,
  addListMovie,
  updateListMovie,
  deleteListMovie,
  getUserLists,
  type ListMovieItemDTO,
  type ListMovieUserEntryDTO,
  type MovieStatus,
} from '@/services/lists'
import type { SearchResultDTO } from '@/services/search'

type ListMovieItem = ListMovieItemDTO & {
  user_entries: ListMovieUserEntryDTO[]
  your_entry?: ListMovieUserEntryDTO | null
  average_rating?: number | null
  added_by_user?: { username: string; email: string; avatar_url?: string | null } | null
}

const computeAverageRating = (entries: ListMovieUserEntryDTO[]): number | null => {
  const ratings = entries
    .map((entry) => entry.rating)
    .filter((rating): rating is number => typeof rating === 'number' && !Number.isNaN(rating))
  if (ratings.length === 0) return null
  const sum = ratings.reduce((acc, value) => acc + value, 0)
  return sum / ratings.length
}

export default function ListPage() {
  const navigate = useNavigate()
  const { listId } = useParams<{ listId: string }>()
  const { user, requireAuth, clearAuth } = useAuth()
  const parsedId = useMemo(() => Number(listId), [listId])

  const [items, setItems] = useState<ListMovieItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [listName, setListName] = useState<string | null>(null)

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isLuckyOpen, setIsLuckyOpen] = useState(false)

  // Filter states
  const [listSearchQuery, setListSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<MovieStatus | 'all'>('all')

  // Loading states for individual operations
  const [updatingRatingId, setUpdatingRatingId] = useState<number | null>(null)
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const currentUserId = user?.id ?? null
  const currentUserName = user?.username || user?.email || null
  const currentUserAvatarUrl = user?.avatar_url || null

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
    [currentUserId]
  )

  const applyItems = useCallback(
    (list: ListMovieItemDTO[]) => {
      setItems(list.map(normalizeItem))
    },
    [normalizeItem]
  )

  // Load list data
  useEffect(() => {
    if (!requireAuth()) return
    if (!parsedId || Number.isNaN(parsedId)) return

    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [moviesRes, listsRes] = await Promise.all([
          getListMovies(parsedId),
          getUserLists(),
        ])
        applyItems(moviesRes)
        const currentList = listsRes.lists.find((l) => l.id === parsedId)
        setListName(currentList?.name || null)
      } catch (err) {
        const message = (err as any)?.payload?.error || (err as Error).message || 'Falha ao carregar'
        setError(message)
        if ((err as any)?.status === 401) {
          clearAuth()
        }
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [parsedId, requireAuth, clearAuth, applyItems])

  // Animation on mount
  useEffect(() => {
    if (loading) return
    const elements = document.querySelectorAll('[data-animate]')
    elements.forEach((el, i) => {
      const htmlEl = el as HTMLElement
      htmlEl.style.opacity = '0'
      htmlEl.style.transform = 'translateY(20px)'
      setTimeout(() => {
        htmlEl.style.transition = 'all 0.4s ease-out'
        htmlEl.style.opacity = '1'
        htmlEl.style.transform = 'translateY(0)'
      }, i * 50)
    })
  }, [loading])

  const handleChangeRating = async (movieId: number, value: number) => {
    if (!parsedId || Number.isNaN(parsedId) || currentUserId == null) return
    setUpdatingRatingId(movieId)
    const previousItems = items

    try {
      // Optimistic update
      setItems((prev) =>
        prev.map((it) => {
          if (it.movie_id !== movieId) return it
          const yourEntry = it.your_entry ?? {
            user_id: currentUserId,
            rating: null,
            status: it.status,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          return {
            ...it,
            rating: value,
            your_entry: { ...yourEntry, rating: value },
          }
        })
      )

      await updateListMovie(parsedId, movieId, { rating: value })
      const res = await getListMovies(parsedId)
      applyItems(res)
    } catch (err) {
      setItems(previousItems)
      const message = (err as any)?.payload?.error || (err as Error).message
      setError(message)
      if ((err as any)?.status === 401) clearAuth()
    } finally {
      setUpdatingRatingId(null)
    }
  }

  const handleChangeStatus = async (movieId: number, status: MovieStatus) => {
    if (!parsedId || Number.isNaN(parsedId)) return
    setUpdatingStatusId(movieId)
    const previousItems = items

    try {
      // Optimistic update
      setItems((prev) =>
        prev.map((it) => (it.movie_id === movieId ? { ...it, status } : it))
      )

      await updateListMovie(parsedId, movieId, { status })
      const res = await getListMovies(parsedId)
      applyItems(res)
    } catch (err) {
      setItems(previousItems)
      const message = (err as any)?.payload?.error || (err as Error).message
      setError(message)
      if ((err as any)?.status === 401) clearAuth()
    } finally {
      setUpdatingStatusId(null)
    }
  }

  const handleDelete = async (movieId: number) => {
    if (!parsedId || Number.isNaN(parsedId)) return
    setDeletingId(movieId)

    try {
      await deleteListMovie(parsedId, movieId)
      setItems((prev) => prev.filter((it) => it.movie_id !== movieId))
    } catch (err) {
      const message = (err as any)?.payload?.error || (err as Error).message
      setError(message)
      if ((err as any)?.status === 401) clearAuth()
    } finally {
      setDeletingId(null)
    }
  }

  const handleAddMovie = async (result: SearchResultDTO) => {
    if (!parsedId || Number.isNaN(parsedId)) return

    try {
      await addListMovie(parsedId, { id: String(result.id), media_type: result.media_type })
      const res = await getListMovies(parsedId)
      applyItems(res)
    } catch (err) {
      const message = (err as any)?.payload?.error || (err as Error).message
      setError(message)
      if ((err as any)?.status === 401) clearAuth()
    }
  }

  // Filtered items
  const effectiveItems = useMemo(() => {
    let filtered = items

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((it) => it.status === statusFilter)
    }

    // Search filter
    if (listSearchQuery.trim()) {
      const q = listSearchQuery.toLowerCase()
      filtered = filtered.filter((it) =>
        it.movie.title.toLowerCase().includes(q) ||
        it.movie.original_title?.toLowerCase().includes(q)
      )
    }

    return filtered
  }, [items, statusFilter, listSearchQuery])

  // Unwatched items for lucky feature
  const unwatchedItems = useMemo(
    () => items.filter((it) => it.status === 'not_watched'),
    [items]
  )

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {loading ? (
          <>
            <SkeletonHeader />
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </>
        ) : (
          <>
            <ListHeader
              listName={listName}
              onBack={() => navigate('/home')}
              onAddMovie={() => setIsAddOpen(true)}
              onLuckyClick={() => setIsLuckyOpen(true)}
              searchQuery={listSearchQuery}
              onSearchChange={setListSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={(v) => setStatusFilter(v as MovieStatus | 'all')}
              hasUnwatchedMovies={unwatchedItems.length > 0}
            />

            {error && (
              <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-4 text-sm text-rose-300">
                {error}
              </div>
            )}

            {effectiveItems.length === 0 ? (
              <div className="text-center py-16 text-neutral-500">
                {items.length === 0
                  ? 'Nenhum filme na lista. Clique em "Adicionar" para começar!'
                  : 'Nenhum resultado encontrado'}
              </div>
            ) : (
              <div className="space-y-4">
                {effectiveItems.map((item) => (
                  <MovieCard
                    key={item.movie_id}
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
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <SearchModal
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSelect={handleAddMovie}
      />

      <LuckySpinModal
        open={isLuckyOpen}
        onOpenChange={setIsLuckyOpen}
        items={unwatchedItems}
      />
    </div>
  )
}
