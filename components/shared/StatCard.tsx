import React from 'react'

type Props = {
  label: string
  value: string | number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon?: React.ReactNode
  borderColor?: string
}

export function StatCard({ label, value, change, changeType = 'neutral', icon, borderColor = 'border-l-saffron-500' }: Props) {
  const changeColors = {
    positive: 'text-green-400',
    negative: 'text-red-400',
    neutral: 'text-gray-500',
  }

  return (
    <div className={`bg-[#111827] border border-[#1F2D42] rounded-2xl p-6 border-l-4 ${borderColor} transition-colors hover:border-[#2563EB20]`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
        {icon && <span className="text-gray-500">{icon}</span>}
      </div>
      <p className="text-3xl font-bold font-heading text-white mb-1">{value}</p>
      {change && (
        <p className={`text-xs font-medium ${changeColors[changeType]}`}>
          {changeType === 'positive' ? '↑' : changeType === 'negative' ? '↓' : '→'} {change}
        </p>
      )}
    </div>
  )
}
