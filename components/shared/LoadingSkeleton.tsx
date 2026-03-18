export function CardSkeleton() {
  return (
    <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-5 animate-pulse space-y-3">
      <div className="h-4 bg-[#1A2235] rounded-lg w-3/4" />
      <div className="h-3 bg-[#1A2235] rounded-lg w-1/2" />
      <div className="h-3 bg-[#1A2235] rounded-lg w-2/3" />
    </div>
  )
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 bg-[#1A2235] rounded-lg w-full" />
        </td>
      ))}
    </tr>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-6 animate-pulse border-l-4 border-l-gray-700">
      <div className="h-3 bg-[#1A2235] rounded w-20 mb-3" />
      <div className="h-8 bg-[#1A2235] rounded w-16 mb-2" />
      <div className="h-3 bg-[#1A2235] rounded w-24" />
    </div>
  )
}
