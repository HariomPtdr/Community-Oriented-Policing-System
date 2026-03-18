import { AppShell } from '@/components/shared/AppShell'
export default function OversightLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {/* Oversight banner */}
      <div className="bg-teal-900/30 border-b border-teal-700/30 px-4 py-2 text-center">
        <p className="text-teal-400 text-xs font-semibold">
          🛡 Civilian Oversight Board — Independent Review
        </p>
      </div>
      <AppShell role="oversight" userName="Oversight Officer">{children}</AppShell>
    </div>
  )
}
