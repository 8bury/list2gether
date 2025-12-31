import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-white text-black",
        secondary: "border-transparent bg-white/10 text-white",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "border-white/10 text-white",
        watching: "border-white/10 bg-white/10 text-sky-300",
        watched: "border-white/10 bg-white/10 text-emerald-300",
        dropped: "border-white/10 bg-white/10 text-rose-300",
        not_watched: "border-white/10 bg-white/10 text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
