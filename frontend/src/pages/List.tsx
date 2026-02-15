import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import Header from '@/components/Header'
import { MovieCard } from '@/components/movie/MovieCard'
import { MovieOverlay } from '@/components/movie/MovieOverlay'
import { ListHeader } from '@/components/list/ListHeader'
import { SearchModal } from '@/components/list/SearchModal'
import { RecommendationsModal } from '@/components/list/RecommendationsModal'
import { SkeletonCard } from '@/components/list/SkeletonCard'
import { SkeletonHeader } from '@/components/list/SkeletonHeader'
import { useAuth } from '@/hooks'
import {
  getListMovies,
  addListMovie,
  updateListMovie,
  deleteListMovie,
  getUserLists,
  reorderMovies,
  type ListMovieItemDTO,
  type ListMovieUserEntryDTO,
  type MovieStatus,
} from '@/services/lists'
import type { SearchResultDTO } from '@/services/search'
import type { ApiException } from '@/services/api'

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
  const { user, clearAuth } = useAuth()
  const parsedId = useMemo(() => Number(listId), [listId])

  const [items, setItems] = useState<ListMovieItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [listName, setListName] = useState<string | null>(null)

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [overlayMovieId, setOverlayMovieId] = useState<number | null>(null)
  const [isRecommendationsOpen, setIsRecommendationsOpen] = useState(false)

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

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      setItems([])
      setListName(null)
      setError('Lista inválida')
      setLoading(false)
      return
    }

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
        const apiErr = err as ApiException
        const message = apiErr.payload?.error || apiErr.message || 'Falha ao carregar'
        setError(message)
        if (apiErr.status === 401) {
          clearAuth()
        }
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [parsedId, clearAuth, applyItems])

  // Poll for collaborative updates every 30s while tab is visible
  useEffect(() => {
    if (!parsedId || loading) return

    let timer: ReturnType<typeof setInterval> | null = null

    const poll = async () => {
      try {
        const moviesRes = await getListMovies(parsedId)
        applyItems(moviesRes)
      } catch {
        // silent — don't disrupt UI on background poll failure
      }
    }

    const start = () => {
      if (!timer) timer = setInterval(poll, 30_000)
    }
    const stop = () => {
      if (timer) { clearInterval(timer); timer = null }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        poll()
        start()
      } else {
        stop()
      }
    }

    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [parsedId, loading, applyItems])

  // Animation is now handled via CSS classes in MovieCard to avoid
  // conflicts with focus states and dnd-kit transforms on tablets

  const handleChangeRating = async (movieId: number, value: number) => {
    if (!parsedId || Number.isNaN(parsedId) || currentUserId == null) return
    setUpdatingRatingId(movieId)
    const previousItems = items

    // Convert 0 to null (delete rating)
    const ratingValue = value === 0 ? null : value

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
            rating: ratingValue,
            your_entry: { ...yourEntry, rating: ratingValue },
          }
        })
      )

      await updateListMovie(parsedId, movieId, { rating: ratingValue })
      const res = await getListMovies(parsedId)
      applyItems(res)

      // Após adicionar nota, perguntar se quer marcar como assistido
      const currentItem = res.find(item => item.movie_id === movieId)
      if (currentItem && currentItem.status !== 'watched') {
        toast('🎬 Filme avaliado!', {
          description: 'Deseja marcar este filme como assistido?',
          action: {
            label: '✓ Sim, marcar',
            onClick: async () => {
              await handleChangeStatus(movieId, 'watched')
            },
          },
          cancel: {
            label: 'Não',
            onClick: () => {}, // Apenas fecha o toast
          },
          duration: 5000,
        })
      }
    } catch (err) {
      setItems(previousItems)
      const apiErr = err as ApiException
      const message = apiErr.payload?.error || apiErr.message
      setError(message)
      if (apiErr.status === 401) clearAuth()
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
      const apiErr = err as ApiException
      const message = apiErr.payload?.error || apiErr.message
      setError(message)
      if (apiErr.status === 401) clearAuth()
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
      const apiErr = err as ApiException
      const message = apiErr.payload?.error || apiErr.message
      setError(message)
      if (apiErr.status === 401) clearAuth()
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
      const apiErr = err as ApiException
      const message = apiErr.payload?.error || apiErr.message
      setError(message)
      if (apiErr.status === 401) clearAuth()
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((item) => item.movie_id === active.id)
    const newIndex = items.findIndex((item) => item.movie_id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // Optimistically update the UI
    const reorderedItems = arrayMove(items, oldIndex, newIndex)
    setItems(reorderedItems)

    // Create the order map based on new positions
    const movieOrders = reorderedItems.map((item, index) => ({
      movie_id: item.movie_id,
      display_order: index,
    }))

    try {
      await reorderMovies(parsedId, { movie_orders: movieOrders })
    } catch (err) {
      // Revert on error
      setItems(items)
      const apiErr = err as ApiException
      const message = apiErr.payload?.error || apiErr.message
      toast.error(message || 'Falha ao reordenar filmes')
      if (apiErr.status === 401) clearAuth()
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
              onRecommendationsClick={() => setIsRecommendationsOpen(true)}
              movieCount={items.length}
              searchQuery={listSearchQuery}
              onSearchChange={setListSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={(v) => setStatusFilter(v as MovieStatus | 'all')}
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
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={effectiveItems.map((item) => item.movie_id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {effectiveItems.map((item) => (
                      <MovieCard
                        key={item.movie_id}
                        item={item}
                        onChangeRating={handleChangeRating}
                        onChangeStatus={handleChangeStatus}
                        onDelete={handleDelete}
                        onOpenOverlay={setOverlayMovieId}
                        updatingRating={updatingRatingId === item.movie_id}
                        updatingStatus={updatingStatusId === item.movie_id}
                        deleting={deletingId === item.movie_id}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
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

      <RecommendationsModal
        open={isRecommendationsOpen}
        onOpenChange={setIsRecommendationsOpen}
        listId={parsedId}
        onMovieAdded={async () => {
          try {
            const res = await getListMovies(parsedId)
            applyItems(res)
          } catch (err) {
            console.error('Failed to refresh list:', err)
          }
        }}
      />

      {/* Movie Overlay */}
      {overlayMovieId !== null && (
        <MovieOverlay
          isOpen={overlayMovieId !== null}
          onClose={() => setOverlayMovieId(null)}
          item={items.find((item) => item.movie_id === overlayMovieId)!}
          listId={parsedId}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          currentUserAvatarUrl={currentUserAvatarUrl}
          onChangeRating={handleChangeRating}
          updatingRating={updatingRatingId === overlayMovieId}
        />
      )}
    </div>
  )
}
