import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function handleAuthRedirects(
  request: NextRequest,
  pathname: string,
  user: unknown,
): NextResponse | null {
  // Protect routes that require authentication
  const protectedPaths = ['/mypage', '/likes', '/chat', '/reservations', '/estimates', '/dashboard']
  const isProtectedRoute = protectedPaths.some((p) => pathname.startsWith(p))

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Redirect logged-in users away from auth pages (exact match only)
  const authPaths = ['/login', '/signup']
  const isAuthRoute = authPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return null
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: DO NOT REMOVE auth.getUser()
  // Refreshes the auth token and validates the user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const authRedirect = handleAuthRedirects(request, pathname, user)
  if (authRedirect) return authRedirect

  return supabaseResponse
}
