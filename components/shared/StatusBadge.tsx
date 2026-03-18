import { STATUS_VISUAL } from '@/lib/types'

type Props = { status: string }

export function StatusBadge({ status }: Props) {
  const config = STATUS_VISUAL[status] ?? STATUS_VISUAL.submitted
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}
