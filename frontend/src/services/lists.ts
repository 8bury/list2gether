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


