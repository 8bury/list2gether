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
  media_type: 'movie' | 'tv'
  seasons_count?: number | null
  episodes_count?: number | null
  series_status?: string | null
  genres?: GenreDTO[]
  poster_url?: string | null
}

export interface ListMovieItemDTO {
  id: number
  list_id: number
  movie_id: number
  status: MovieStatus
  added_by?: number | null
  added_at: string
  watched_at?: string | null
  updated_at: string
  rating?: number | null
  notes?: string | null
  movie: MovieDTO
}

export async function getListMovies(listId: number): Promise<ListMovieItemDTO[]> {
  const token = localStorage.getItem('access_token')
  const res = await requestJson<{ movies: ListMovieItemDTO[]; count: number }>(`/api/lists/${listId}/movies`, {
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
  notes?: string | null
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
    old_notes?: string | null
    new_notes?: string | null
    watched_at?: string | null
    updated_at?: string
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

