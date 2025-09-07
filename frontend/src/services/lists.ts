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


