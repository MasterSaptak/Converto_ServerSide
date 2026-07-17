import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  if (!supabaseUrl || !supabaseKey) {
    // If Supabase is not configured, redirect to login with a message
    if (!request.nextUrl.pathname.startsWith('/login')) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Allow access to login, auth, and API routes without authentication redirect
  const isPublicPath =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/auth') ||
    request.nextUrl.pathname.startsWith('/unauthorized')
    
  const isApiRoute = request.nextUrl.pathname.startsWith('/api')

  if (!user && !isPublicPath && !isApiRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If user is authenticated, check staff status for non-public, non-api routes
  if (user && !isPublicPath && !isApiRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_staff')
      .eq('id', user.id)
      .single()

    if (!profile?.is_staff) {
      const url = request.nextUrl.clone()
      url.pathname = '/unauthorized'
      return NextResponse.redirect(url)
    }
  }

  // If user is on login page but already authenticated as staff, redirect to dashboard
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_staff')
      .eq('id', user.id)
      .single()

    if (profile?.is_staff) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return response
}
