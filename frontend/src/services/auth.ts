import { requestJson } from './api'

export interface UserDTO {
  id: number
  username: string
  email: string
  created_at?: string
  updated_at?: string
}

export interface LoginResponseDTO {
  user: UserDTO
  access_token: string
  refresh_token: string
  expires_in: number
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


