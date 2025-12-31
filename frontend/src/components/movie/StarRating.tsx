import { useRef } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  rating: number // 0-10 scale
  onChange?: (rating: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
}

export function StarRating({ rating, onChange, readonly = false, size = 'md', disabled = false, className }: StarRatingProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const fullCount = Math.floor(rating / 2)
  const hasHalf = rating % 2 === 1

  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  }

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (readonly || disabled || !onChange || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    let ratio = (e.clientX - rect.left) / rect.width
    if (ratio < 0) ratio = 0
    if (ratio > 1) ratio = 1
    let value = Math.round(ratio * 10)
    if (value < 1) value = 1
    if (value > 10) value = 10
    onChange(value)
  }

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className={cn(
        'flex gap-0.5',
        !readonly && !disabled && 'cursor-pointer select-none group',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      title={readonly ? undefined : 'Clique para avaliar'}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="relative transition-transform group-hover:scale-110">
          {/* Empty star (background) */}
          <Star
            className={cn(
              sizeClasses[size],
              'text-neutral-800 fill-neutral-800 transition-colors'
            )}
          />

          {/* Full star */}
          {i < fullCount && (
            <Star
              className={cn(
                sizeClasses[size],
                'absolute inset-0 text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
              )}
            />
          )}

          {/* Half star */}
          {i === fullCount && hasHalf && (
            <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
              <Star
                className={cn(
                  sizeClasses[size],
                  'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                )}
              />
            </div>
          )}
        </div>
      ))}

      {rating > 0 && (
        <span className={cn(
          'ml-1.5 font-semibold',
          size === 'sm' && 'text-xs',
          size === 'md' && 'text-sm',
          size === 'lg' && 'text-base',
          'bg-gradient-to-br from-amber-200 via-amber-300 to-amber-500 bg-clip-text text-transparent'
        )}>
          {rating}
        </span>
      )}
    </div>
  )
}
