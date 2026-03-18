import { AppShell } from '@/components/shared/AppShell'
export default function SHOLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="sho" userName="SHO R. Singh">{children}</AppShell>
}
