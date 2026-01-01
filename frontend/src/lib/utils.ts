import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function getRelativeTime(dateStr: string, locale: 'pt' | 'en' = 'pt'): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  const diffWeek = Math.floor(diffDay / 7)
  const diffMonth = Math.floor(diffDay / 30)
  const diffYear = Math.floor(diffDay / 365)

  if (locale === 'en') {
    if (diffSec < 60) return 'just now'
    if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`
    if (diffHour < 24) return `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`
    if (diffDay < 7) return `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`
    if (diffWeek < 4) return `${diffWeek} ${diffWeek === 1 ? 'week' : 'weeks'} ago`
    if (diffMonth < 12) return `${diffMonth} ${diffMonth === 1 ? 'month' : 'months'} ago`
    return `${diffYear} ${diffYear === 1 ? 'year' : 'years'} ago`
  }

  if (diffSec < 60) return 'agora mesmo'
  if (diffMin < 60) return `há ${diffMin} ${diffMin === 1 ? 'minuto' : 'minutos'}`
  if (diffHour < 24) return `há ${diffHour} ${diffHour === 1 ? 'hora' : 'horas'}`
  if (diffDay < 7) return `há ${diffDay} ${diffDay === 1 ? 'dia' : 'dias'}`
  if (diffWeek < 4) return `há ${diffWeek} ${diffWeek === 1 ? 'semana' : 'semanas'}`
  if (diffMonth < 12) return `há ${diffMonth} ${diffMonth === 1 ? 'mês' : 'meses'}`
  return `há ${diffYear} ${diffYear === 1 ? 'ano' : 'anos'}`
}

export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

