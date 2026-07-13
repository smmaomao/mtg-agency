import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicPaths = ['/login', '/api/login']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 认证检查（仅 dashboard 页面需要登录态）
  if (!publicPaths.some(p => pathname.startsWith(p))) {
    if (pathname.startsWith('/dashboard')) {
      const token = request.cookies.get('admin_token')?.value
      if (!token) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
}
