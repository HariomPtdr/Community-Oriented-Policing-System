'use client'

import { useEffect, useState } from 'react'
import { AppShell } from '@/components/shared/AppShell'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'citizen') {
        router.push('/login')
        return
      }
      setUserName(profile?.full_name || user.email?.split('@')[0] || 'Citizen')
      setLoading(false)
    }
    fetchUser()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    )
  }

  return (
    <AppShell role="citizen" userName={userName || 'Citizen'}>
      {children}
    </AppShell>
  )
}
