import { Skeleton } from '@/components/ui/skeleton'

export function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 overflow-hidden">
      <div className="flex animate-pulse">
        {/* Poster skeleton */}
        <Skeleton className="w-32 sm:w-36 aspect-[2/3] bg-white/10" />

        {/* Content skeleton */}
        <div className="p-4 sm:p-5 flex-1 space-y-3">
          {/* Title & badges */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Skeleton className="h-6 w-48 bg-white/10" />
              <Skeleton className="h-6 w-16 rounded-full bg-white/10" />
              <Skeleton className="h-6 w-24 rounded-full bg-white/10" />
            </div>
            <Skeleton className="h-3 w-32 bg-white/10" />
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="w-5 h-5 rounded bg-white/10" />
            ))}
            <Skeleton className="w-9 h-9 rounded-md bg-white/10" />
          </div>

          {/* Date */}
          <Skeleton className="h-4 w-28 bg-white/10" />

          {/* Details button */}
          <Skeleton className="h-9 w-full rounded-lg bg-white/10" />
        </div>
      </div>
    </div>
  )
}
