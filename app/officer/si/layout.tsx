import { AppShell } from '@/components/shared/AppShell'
export default function SILayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="si" userName="SI Vijay Singh">{children}</AppShell>
}
