import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicPaths = ['/login', '/api/login']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 认证检查
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

  // 非 API 请求直接放行
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // API 请求：用 fetch 代理测量真实整请求耗时与状态码
  // middleware 默认在 Edge 运行，NextResponse.next() 无法感知下游
  // route handler 的真实耗时/状态码，因此主动 fetch 一次以记录。
  const start = performance.now()
  const timestamp = new Date().toISOString()
  try {
    const response = await fetch(request)
    const elapsed = Math.round(performance.now() - start)
    console.log(`[REQ ${timestamp}] ${request.method} ${pathname} → ${response.status} (${elapsed}ms)`)
    return response
  } catch (e: any) {
    const elapsed = Math.round(performance.now() - start)
    console.error(`[REQ ${timestamp}] ${request.method} ${pathname} ❌ proxy failed (${elapsed}ms):`, e?.message)
    // 兜底：放行让 Next.js 正常处理
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
}
