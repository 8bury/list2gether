import { requestJson } from './api'

export interface SearchResultDTO {
  id: number
  name: string
  original_name?: string | null
  poster_url?: string | null
  media_type: 'movie' | 'tv'
}

export interface SearchResponseDTO {
  results: SearchResultDTO[]
  total_results: number
  query: string
}

export async function searchMedia(query: string, signal?: AbortSignal): Promise<SearchResponseDTO> {
  const token = localStorage.getItem('access_token')
  const params = new URLSearchParams({ q: query })
  return requestJson<SearchResponseDTO>(`/api/search/media?${params.toString()}` , {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    signal,
  })
}


