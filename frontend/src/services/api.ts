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
    return 'http://localhost:8080'
  }
  return baseUrl.replace(/\/$/, '')
}

export const apiBaseUrl = getApiBaseUrl()

let refreshingAccessTokenPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  if (refreshingAccessTokenPromise) {
    return refreshingAccessTokenPromise
  }
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) {
    throw new Error('No refresh token')
  }
  refreshingAccessTokenPromise = (async () => {
    const res = await fetch(`${apiBaseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    const contentType = res.headers.get('content-type') || ''
    const isJson = contentType.includes('application/json')
    if (!res.ok) {
      try {
        if (isJson) {
          await res.json()
        }
      } catch {}
      throw new Error('Failed to refresh token')
    }
    const data = (isJson ? await res.json() : {}) as {
      access_token?: string
      refresh_token?: string
    }
    const newToken = data.access_token || ''
    if (!newToken) {
      throw new Error('Failed to refresh token')
    }
    localStorage.setItem('access_token', newToken)
    if (data.refresh_token) {
      localStorage.setItem('refresh_token', data.refresh_token)
    }
    return newToken
  })()

  try {
    return await refreshingAccessTokenPromise
  } finally {
    refreshingAccessTokenPromise = null
  }
}

export async function requestJson<T>(path: string, options: JsonRequestOptions = {}): Promise<T> {
  const url = `${apiBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  const doFetch = async (overrideHeaders?: HeadersInit) => {
    return fetch(url, {
      ...options,
      headers: overrideHeaders || headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
  }

  let response = await doFetch()

  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')

  if (!response.ok) {
    let errorPayload: ApiError | undefined
    if (isJson) {
      try {
        errorPayload = (await response.json()) as ApiError
      } catch {
      }
    }
    const shouldAttemptRefresh =
      (response.status === 401 || response.status === 403) &&
      (errorPayload?.code === 'TOKEN_INVALID')

    if (shouldAttemptRefresh) {
      try {
        const newToken = await refreshAccessToken()
        const newHeaders: HeadersInit = {
          ...headers,
          Authorization: `Bearer ${newToken}`,
        }
        response = await doFetch(newHeaders)
        const retryContentType = response.headers.get('content-type') || ''
        const retryIsJson = retryContentType.includes('application/json')
        if (!response.ok) {
          let retryPayload: ApiError | undefined
          if (retryIsJson) {
            try {
              retryPayload = (await response.json()) as ApiError
            } catch {}
          }
          const retryMessage = retryPayload?.error || `Request failed with status ${response.status}`
          const retryError = new Error(retryMessage) as Error & { payload?: ApiError; status?: number }
          retryError.payload = retryPayload
          retryError.status = response.status
          throw retryError
        }
        if (retryIsJson) {
          return (await response.json()) as T
        }
        // @ts-expect-error
        return undefined
      } catch {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        const message = errorPayload?.error || `Request failed with status ${response.status}`
        const error = new Error(message) as Error & { payload?: ApiError; status?: number }
        error.payload = errorPayload
        error.status = response.status
        throw error
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

  // @ts-expect-error
  return undefined
}


