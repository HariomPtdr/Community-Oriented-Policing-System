import { AppShell } from '@/components/shared/AppShell'

export default function ConstableLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="constable" userName="Const. Sharma">{children}</AppShell>
}
