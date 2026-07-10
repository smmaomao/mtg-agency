import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicPaths = ['/login', '/api/login']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method
  const start = Date.now()

  // Allow public paths
  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Check auth for dashboard routes
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('admin_token')?.value
    if (!token) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  const response = NextResponse.next()

  // 记录 API 请求日志
  if (pathname.startsWith('/api/')) {
    const elapsed = Date.now() - start
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] ${method} ${pathname} → ${response.status} (${elapsed}ms)`)
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
}
