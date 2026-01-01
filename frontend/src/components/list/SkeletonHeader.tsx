import { Skeleton } from '@/components/ui/skeleton'

export function SkeletonHeader() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Top row: back button, title, actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Skeleton className="w-10 h-10 rounded-lg bg-white/10" />
          <Skeleton className="h-8 w-48 bg-white/10" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32 rounded-lg bg-white/10" />
          <Skeleton className="h-10 w-40 rounded-lg bg-white/10" />
        </div>
      </div>

      {/* Search & filters */}
      <div className="grid sm:grid-cols-12 gap-3">
        <Skeleton className="sm:col-span-7 h-10 rounded-lg bg-white/10" />
        <Skeleton className="sm:col-span-5 h-10 rounded-lg bg-white/10" />
      </div>
    </div>
  )
}
