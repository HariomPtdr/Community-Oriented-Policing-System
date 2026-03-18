import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ROLE_HOME } from '@/lib/types'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', data.user.id).single()

      const redirectTo = ROLE_HOME[profile?.role as string] ?? '/citizen/dashboard'
      return NextResponse.redirect(`${origin}${redirectTo}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Auth failed`)
}
