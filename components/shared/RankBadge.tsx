import { RANK_CONFIG } from '@/lib/types'

type Props = { role: string; size?: 'sm' | 'md' }

export function RankBadge({ role, size = 'sm' }: Props) {
  const config = RANK_CONFIG[role] ?? RANK_CONFIG.citizen
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
  return (
    <span className={`inline-flex items-center rounded-lg font-bold font-mono ${sizeClass} ${config.color}`}>
      {config.label}
    </span>
  )
}
