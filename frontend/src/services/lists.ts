import { requestJson } from './api'

export interface UserListDTO {
  id: number
  name: string
  description?: string | null
  invite_code: string
  your_role: 'owner' | 'participant'
  created_at: string
  updated_at: string
  member_count: number
  movie_count: number
}

export interface ListsResponseDTO {
  lists: UserListDTO[]
  pagination: {
    total: number
    limit: number
    offset: number
    has_more: boolean
  }
}

export async function getUserLists(params?: { role?: 'owner' | 'participant'; limit?: number; offset?: number }): Promise<ListsResponseDTO> {
  const token = localStorage.getItem('access_token')
  const searchParams = new URLSearchParams()
  if (params?.role) searchParams.set('role', params.role)
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.offset) searchParams.set('offset', String(params.offset))
  const query = searchParams.toString()
  return requestJson<ListsResponseDTO>(`/api/lists${query ? `?${query}` : ''}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
}

export interface CreateListBodyDTO {
  name: string
  description?: string
}

export interface CreateListResponseDTO {
  id: number
  name: string
  description?: string | null
  invite_code: string
  created_by: number
  created_at: string
  updated_at: string
}

export async function createList(body: CreateListBodyDTO): Promise<CreateListResponseDTO> {
  const token = localStorage.getItem('access_token')
  return requestJson<CreateListResponseDTO>('/api/lists', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body,
  })
}

export interface JoinListResponseDTO {
  message: string
  list: {
    id: number
    name: string
    description?: string | null
    created_by: number
    created_at: string
    creator: { id: number; username: string; email: string }
    member_count: number
  }
  your_role: 'owner' | 'participant'
}

export async function joinList(inviteCode: string): Promise<JoinListResponseDTO> {
  const token = localStorage.getItem('access_token')
  return requestJson<JoinListResponseDTO>('/api/lists/join', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: { invite_code: inviteCode },
  })
}

export async function deleteList(listId: number): Promise<void> {
  const token = localStorage.getItem('access_token')
  await requestJson<void>(`/api/lists/${listId}` , {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
}

export async function leaveList(listId: number): Promise<void> {
  const token = localStorage.getItem('access_token')
  await requestJson<void>(`/api/lists/${listId}/leave`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
}


export type MovieStatus = 'not_watched' | 'watching' | 'watched' | 'dropped'

export interface GenreDTO {
  id: number
  name: string
}

export interface MovieDTO {
  id: number
  title: string
  original_title?: string | null
  original_lang?: string | null
  overview?: string | null
  release_date?: string | null
  poster_path?: string | null
  popularity?: number | null
  imdb_id?: string | null
  media_type: 'movie' | 'tv'
  seasons_count?: number | null
  episodes_count?: number | null
  series_status?: string | null
  genres?: GenreDTO[]
  poster_url?: string | null
}

export interface ListMovieUserEntryDTO {
  user_id: number
  rating?: number | null
  created_at: string
  updated_at: string
  user?: {
    id: number
    username: string
    email: string
    avatar_url?: string | null
  }
}

export interface AddedByUserDTO {
  id: number
  username: string
  email: string
  avatar_url?: string | null
}

export interface ListMovieItemDTO {
  id: number
  list_id: number
  movie_id: number
  status: MovieStatus
  added_by?: number | null
  added_by_user?: AddedByUserDTO | null
  added_at: string
  watched_at?: string | null
  updated_at: string
  rating?: number | null
  average_rating?: number | null
  your_entry?: ListMovieUserEntryDTO | null
  user_entries?: ListMovieUserEntryDTO[]
  movie: MovieDTO
}

export async function getListMovies(listId: number, params?: { status?: MovieStatus | 'all' }): Promise<ListMovieItemDTO[]> {
  const token = localStorage.getItem('access_token')
  const searchParams = new URLSearchParams()
  if (params?.status && params.status !== 'all') searchParams.set('status', params.status)
  const query = searchParams.toString()
  const res = await requestJson<{ movies: ListMovieItemDTO[]; count: number }>(`/api/lists/${listId}/movies${query ? `?${query}` : ''}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (res && Array.isArray(res.movies)) return res.movies
  return []
}

export interface AddListMovieBodyDTO {
  id: string
  media_type: 'movie' | 'tv'
}

export async function addListMovie(listId: number, body: AddListMovieBodyDTO): Promise<void> {
  const token = localStorage.getItem('access_token')
  await requestJson(`/api/lists/${listId}/movies`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body,
  })
}

export interface UpdateListMovieBodyDTO {
  status?: MovieStatus
  rating?: number | null
}

export interface UpdateListMovieResponseDTO {
  success: boolean
  message: string
  data: {
    list_id: number
    movie_id: number
    title: string
    media_type: 'movie' | 'tv'
    old_status?: MovieStatus | null
    new_status?: MovieStatus | null
    old_rating?: number | null
    new_rating?: number | null
    watched_at?: string | null
    updated_at?: string
    old_entry?: ListMovieUserEntryDTO | null
    new_entry?: ListMovieUserEntryDTO | null
    average_rating?: number | null
    your_entry?: ListMovieUserEntryDTO | null
  }
}

export async function updateListMovie(listId: number, movieId: number, body: UpdateListMovieBodyDTO): Promise<UpdateListMovieResponseDTO> {
  const token = localStorage.getItem('access_token')
  return requestJson<UpdateListMovieResponseDTO>(`/api/lists/${listId}/movies/${movieId}`, {
    method: 'PATCH',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body,
  })
}


export async function deleteListMovie(listId: number, movieId: number): Promise<void> {
  const token = localStorage.getItem('access_token')
  await requestJson<void>(`/api/lists/${listId}/movies/${movieId}` , {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
}

export interface SearchListMoviesResponseDTO {
  movies: ListMovieItemDTO[]
  count: number
  pagination: { total: number; limit: number; offset: number; has_more: boolean }
}

export async function searchListMovies(listId: number, query: string, params?: { limit?: number; offset?: number }): Promise<SearchListMoviesResponseDTO> {
  const token = localStorage.getItem('access_token')
  const searchParams = new URLSearchParams({ q: query })
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.offset) searchParams.set('offset', String(params.offset))
  return requestJson<SearchListMoviesResponseDTO>(`/api/lists/${listId}/movies/search?${searchParams.toString()}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
}

// Comment types and functions
export interface CommentDTO {
  id: number
  user_id: number
  content: string
  created_at: string
  updated_at: string
  user?: {
    id: number
    username: string
    email: string
    avatar_url?: string | null
  }
}

export interface CommentsResponseDTO {
  comments: CommentDTO[]
  pagination: {
    total: number
    limit: number
    offset: number
    has_more: boolean
  }
}

export interface CreateCommentResponseDTO {
  success: boolean
  message: string
  comment: CommentDTO
}

export interface UpdateCommentResponseDTO {
  success: boolean
  message: string
  comment: CommentDTO
}

export async function getComments(listId: number, movieId: number, params?: { limit?: number; offset?: number }): Promise<CommentsResponseDTO> {
  const token = localStorage.getItem('access_token')
  const searchParams = new URLSearchParams()
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.offset) searchParams.set('offset', String(params.offset))
  const query = searchParams.toString()
  return requestJson<CommentsResponseDTO>(`/api/lists/${listId}/movies/${movieId}/comments${query ? `?${query}` : ''}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
}

export async function createComment(listId: number, movieId: number, content: string): Promise<CreateCommentResponseDTO> {
  const token = localStorage.getItem('access_token')
  return requestJson<CreateCommentResponseDTO>(`/api/lists/${listId}/movies/${movieId}/comments`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: { content },
  })
}

export async function updateComment(listId: number, movieId: number, commentId: number, content: string): Promise<UpdateCommentResponseDTO> {
  const token = localStorage.getItem('access_token')
  return requestJson<UpdateCommentResponseDTO>(`/api/lists/${listId}/movies/${movieId}/comments/${commentId}`, {
    method: 'PATCH',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: { content },
  })
}

export async function deleteComment(listId: number, movieId: number, commentId: number): Promise<void> {
  const token = localStorage.getItem('access_token')
  await requestJson<void>(`/api/lists/${listId}/movies/${movieId}/comments/${commentId}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
}

// Recommendations types and functions
export interface RecommendationDTO {
  id: number
  title: string
  media_type: 'movie' | 'tv'
  poster_url?: string | null
  overview?: string | null
  score: number
  popularity: number
  genres?: { id: number }[]
}

export interface RecommendationsResponseDTO {
  recommendations: RecommendationDTO[]
  count: number
  generated_at: string
}

export async function getListRecommendations(listId: number, params?: { limit?: number }): Promise<RecommendationsResponseDTO> {
  const token = localStorage.getItem('access_token')
  const searchParams = new URLSearchParams()
  if (params?.limit) searchParams.set('limit', String(params.limit))
  const query = searchParams.toString()
  return requestJson<RecommendationsResponseDTO>(`/api/lists/${listId}/recommendations${query ? `?${query}` : ''}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
}

