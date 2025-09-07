export interface ApiError {
  error: string
  code?: string
  details?: string[]
  timestamp?: string
}

export type JsonRequestOptions = Omit<RequestInit, 'body'> & { body?: unknown }

const getApiBaseUrl = (): string => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined
  if (!baseUrl || baseUrl.trim().length === 0) {
    // Fallback for local development if .env is missing
    return 'http://localhost:8080'
  }
  return baseUrl.replace(/\/$/, '')
}

export const apiBaseUrl = getApiBaseUrl()

export async function requestJson<T>(path: string, options: JsonRequestOptions = {}): Promise<T> {
  const url = `${apiBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  const response = await fetch(url, {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')

  if (!response.ok) {
    let errorPayload: ApiError | undefined
    if (isJson) {
      try {
        errorPayload = (await response.json()) as ApiError
      } catch {
        // ignore
      }
    }
    const message = errorPayload?.error || `Request failed with status ${response.status}`
    const error = new Error(message) as Error & { payload?: ApiError; status?: number }
    error.payload = errorPayload
    error.status = response.status
    throw error
  }

  if (isJson) {
    return (await response.json()) as T
  }

  // @ts-expect-error caller should know when response is not JSON
  return undefined
}


