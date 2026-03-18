import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ROLE_HOME: Record<string, string> = {
  citizen:    '/citizen/dashboard',
  constable:  '/officer/constable/dashboard',
  si:         '/officer/si/dashboard',
  sho:        '/officer/sho/dashboard',
  dsp:        '/officer/dsp/dashboard',
  admin:      '/admin/dashboard',
  oversight:  '/oversight/dashboard',
}

const ROLE_ALLOWED_PREFIXES: Record<string, string[]> = {
  citizen:    ['/citizen'],
  constable:  ['/citizen', '/officer/constable'],
  si:         ['/citizen', '/officer/si', '/officer/constable'],
  sho:        ['/citizen', '/officer/sho', '/officer/si', '/officer/constable'],
  dsp:        ['/officer/dsp'],
  admin:      ['/citizen', '/officer', '/admin', '/oversight'],
  oversight:  ['/oversight'],
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Update request cookies first
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          // Recreate response with updated request
          supabaseResponse = NextResponse.next({ request })
          // Set cookies on response
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do NOT use supabase.auth.getSession() — it reads from cookies
  // without validation. Always use getUser() which validates with the server.
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Skip middleware for API routes, static files, and auth pages
  if (path.startsWith('/api/') || path.startsWith('/_next/')) {
    return supabaseResponse
  }

  const protectedPrefixes = ['/citizen', '/officer', '/admin', '/oversight']
  const isProtected = protectedPrefixes.some(p => path.startsWith(p + '/') || path === p)
  const isAuthPage = ['/login', '/signup', '/reset-password', '/officer-login', '/officer-signup'].includes(path)

  // If user has an error (stale token), clear cookies and redirect to login
  if (userError && isProtected) {
    // Clear all supabase cookies on error
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const response = NextResponse.redirect(url)
    // Delete Supabase auth cookies to prevent loops
    request.cookies.getAll().forEach(cookie => {
      if (cookie.name.includes('supabase') || cookie.name.includes('sb-')) {
        response.cookies.delete(cookie.name)
      }
    })
    return response
  }

  // Redirect unauthenticated users away from protected pages
  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect authenticated users away from auth pages to their dashboard
  if (user && isAuthPage) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      const role = profile?.role as string
      const home = ROLE_HOME[role] ?? '/citizen/dashboard'
      return NextResponse.redirect(new URL(home, request.url))
    } catch {
      // If profile query fails, just let them through
      return supabaseResponse
    }
  }

  // For protected routes, check role authorization
  if (user && isProtected) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const role = profile?.role as string
      
      if (!role) {
        // No profile/role — default to citizen
        if (!path.startsWith('/citizen')) {
          return NextResponse.redirect(new URL('/citizen/dashboard', request.url))
        }
        return supabaseResponse
      }

      const allowed = ROLE_ALLOWED_PREFIXES[role] || ['/citizen']
      const isAllowed = allowed.some(prefix => path.startsWith(prefix))

      if (!isAllowed) {
        const home = ROLE_HOME[role] ?? '/citizen/dashboard'
        return NextResponse.redirect(new URL(home, request.url))
      }
    } catch {
      // If role check fails, allow access to citizen pages by default
      if (!path.startsWith('/citizen')) {
        return NextResponse.redirect(new URL('/citizen/dashboard', request.url))
      }
    }
  }

  // Handle /officer root redirect
  if (user && path === '/officer') {
    try {
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      const home = ROLE_HOME[profile?.role as string] ?? '/citizen/dashboard'
      return NextResponse.redirect(new URL(home, request.url))
    } catch {
      return NextResponse.redirect(new URL('/citizen/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
