export const AUTH_CHANGED_EVENT = 'l2g-auth-changed'

export function notifyAuthChanged(): void {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
}

export function setStoredAuth(accessToken: string, refreshToken: string, user: unknown): void {
  localStorage.setItem('access_token', accessToken)
  localStorage.setItem('refresh_token', refreshToken)
  localStorage.setItem('user', JSON.stringify(user))
  notifyAuthChanged()
}

export function setStoredUser(user: unknown): void {
  localStorage.setItem('user', JSON.stringify(user))
  notifyAuthChanged()
}

export function clearStoredAuth(): void {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
  notifyAuthChanged()
}
