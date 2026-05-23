import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: Readonly<React.ComponentProps<"div">>) {
  return (
    <div
      data-slot="skeleton"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="콘텐츠 로딩 중"
      className={cn("bg-accent motion-safe:animate-pulse rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }
