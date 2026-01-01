import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Define role-based route access
const ROLE_PROTECTED_ROUTES: Record<string, string[]> = {
  '/admin/users': ['admin', 'super_admin', 'office'],
  '/admin/settings': ['admin', 'super_admin'],
  '/admin/settings/company': ['admin', 'super_admin'],
  '/admin/settings/role-permissions': ['admin', 'super_admin'],
  '/admin/commissions/plans': ['admin', 'super_admin', 'office'],
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if needed
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect /admin routes - require authentication
  if (request.nextUrl.pathname.startsWith('/admin') && !user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users away from auth pages
  if ((request.nextUrl.pathname === '/login' || 
       request.nextUrl.pathname === '/signup') && user) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  // Role-based route protection
  if (user && request.nextUrl.pathname.startsWith('/admin')) {
    const pathname = request.nextUrl.pathname
    
    // Check if this route requires specific roles
    const requiredRoles = ROLE_PROTECTED_ROUTES[pathname]
    
    if (requiredRoles) {
      // Fetch user's role from the database
      const { data: userData, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (error || !userData) {
        console.error('Error fetching user role:', error)
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      }

      // Check if user's role is in the required roles list
      if (!requiredRoles.includes(userData.role)) {
        // Redirect to dashboard with error message
        const redirectUrl = new URL('/admin/dashboard', request.url)
        redirectUrl.searchParams.set('error', 'insufficient_permissions')
        return NextResponse.redirect(redirectUrl)
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
