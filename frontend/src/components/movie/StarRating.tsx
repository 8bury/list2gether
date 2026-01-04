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
  const starsRef = useRef<HTMLDivElement>(null)

  const fullCount = Math.floor(rating / 2)
  const hasHalf = rating % 2 === 1

  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  }

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (readonly || disabled || !onChange || !starsRef.current) return

    const rect = starsRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left

    // Calculate which half-star was clicked (0-9 index)
    // Each star is 1/5th of the width, divided into 2 halves
    const starIndex = Math.floor((clickX / rect.width) * 5)
    const starX = (clickX / rect.width) * 5 - starIndex

    // Determine if left half (0.5) or right half (1.0) was clicked
    const halfStar = starX < 0.5 ? 0.5 : 1.0

    // Convert to rating (1-10 scale)
    let value = Math.ceil((starIndex + halfStar) * 2)

    // Clamp to valid range
    if (value < 1) value = 1
    if (value > 10) value = 10

    onChange(value)
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1.5',
        className
      )}
    >
      <div
        ref={starsRef}
        onClick={handleClick}
        className={cn(
          'flex gap-0.5',
          !readonly && !disabled && 'cursor-pointer select-none group',
          disabled && 'opacity-50 cursor-not-allowed'
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
      </div>

      {rating > 0 && (
        <span className={cn(
          'font-semibold',
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
