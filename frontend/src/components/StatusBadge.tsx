import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { MovieStatus } from '@/services/lists'

const statusConfig: Record<MovieStatus, { label: string; variant: 'not_watched' | 'watching' | 'watched' | 'dropped' }> = {
  not_watched: {
    label: 'Não Assistido',
    variant: 'not_watched',
  },
  watching: {
    label: 'Assistindo',
    variant: 'watching',
  },
  watched: {
    label: 'Assistido',
    variant: 'watched',
  },
  dropped: {
    label: 'Abandonado',
    variant: 'dropped',
  },
}

interface StatusBadgeProps {
  status: MovieStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <Badge variant={config.variant} className={cn(className)}>
      {config.label}
    </Badge>
  )
}

export { statusConfig }
