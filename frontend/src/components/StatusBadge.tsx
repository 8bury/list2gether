import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { MovieStatus } from '@/services/lists'

const statusConfig: Record<MovieStatus, { variant: 'not_watched' | 'watching' | 'watched' | 'dropped' }> = {
  not_watched: {
    variant: 'not_watched',
  },
  watching: {
    variant: 'watching',
  },
  watched: {
    variant: 'watched',
  },
  dropped: {
    variant: 'dropped',
  },
}

interface StatusBadgeProps {
  status: MovieStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useTranslation()
  const config = statusConfig[status]
  return (
    <Badge variant={config.variant} className={cn(className)}>
      {t(`status.${status}`)}
    </Badge>
  )
}


