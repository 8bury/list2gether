import { requestJson } from './api'

export interface UserDTO {
  id: number
  username: string
  email: string
  avatar_url?: string
  created_at?: string
  updated_at?: string
}

export interface LoginResponseDTO {
  user: UserDTO
  access_token: string
  refresh_token: string
  expires_in: number
  access_token_expires_at: number
}


export interface RegisterBodyDTO {
  username: string
  email: string
  password: string
}

export interface RegisterResponseDTO {
  message?: string
  user: UserDTO
}

export async function login(email: string, password: string): Promise<LoginResponseDTO> {
  return requestJson<LoginResponseDTO>('/auth/login', {
    method: 'POST',
    body: { email, password },
  })
}

export async function register(body: RegisterBodyDTO): Promise<RegisterResponseDTO> {
  return requestJson<RegisterResponseDTO>('/auth/register', {
    method: 'POST',
    body,
  })
}

export interface RefreshResponseDTO {
  access_token: string
  refresh_token: string
  expires_in: number
  access_token_expires_at: number
}

export async function refresh(refreshToken: string): Promise<RefreshResponseDTO> {
  return requestJson<RefreshResponseDTO>('/auth/refresh', {
    method: 'POST',
    body: { refresh_token: refreshToken },
  })
}

export async function logout(refreshToken: string | null): Promise<{ message?: string } | void> {
  if (!refreshToken) {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    return
  }
  try {
    return await requestJson<{ message?: string }>('/auth/logout', {
      method: 'POST',
      body: { refresh_token: refreshToken },
    })
  } finally {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
  }
}


export interface UpdateProfileBodyDTO {
  username: string
  avatar_url: string
}

export interface UpdateProfileResponseDTO {
  message?: string
  user: UserDTO
}

export async function updateProfile(body: UpdateProfileBodyDTO): Promise<UpdateProfileResponseDTO> {
  const accessToken = localStorage.getItem('access_token')
  return requestJson<UpdateProfileResponseDTO>('/auth/profile', {
    method: 'PUT',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    body,
  })
}


