import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn, getInitials } from '@/lib/utils'

interface UserAvatarProps {
  avatarUrl?: string | null
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[9px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 sm:w-10 sm:h-10 text-sm',
  lg: 'w-12 h-12 text-base',
}

export function UserAvatar({ avatarUrl, name, size = 'md', className }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false)
  const initials = getInitials(name)

  return (
    <Avatar className={cn(sizeClasses[size], 'border-2 border-white/20', className)}>
      {avatarUrl && !imgError ? (
        <AvatarImage
          src={avatarUrl}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />
      ) : null}
      <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white font-bold">
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
