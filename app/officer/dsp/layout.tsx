import { AppShell } from '@/components/shared/AppShell'
export default function DSPLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="dsp" userName="DSP K. Dubey">{children}</AppShell>
}
