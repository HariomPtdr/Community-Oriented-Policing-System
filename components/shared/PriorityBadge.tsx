import { PRIORITY_VISUAL } from '@/lib/types'

type Props = { priority: string }

export function PriorityBadge({ priority }: Props) {
  const config = PRIORITY_VISUAL[priority] ?? PRIORITY_VISUAL.low
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${config.color} ${config.pulse ? 'animate-pulse' : ''}`}>
      ● {config.label}
    </span>
  )
}
