// 请求级计时装饰器：包裹 route handler，打印整请求耗时 + 真实状态码
type Handler = (...args: any[]) => Promise<Response> | Response

export function withTiming(handler: Handler): Handler {
  return async (...args: any[]) => {
    const start = performance.now()
    const req = args[0] as (Request & { nextUrl?: URL }) | undefined
    const method = req?.method ?? '?'
    const pathname = req?.nextUrl?.pathname ?? '?'
    try {
      const res = await handler(...args)
      const elapsed = Math.round(performance.now() - start)
      console.log(`[REQ ${elapsed}ms] ${method} ${pathname} → ${res?.status ?? '?'}`)
      return res
    } catch (e: any) {
      const elapsed = Math.round(performance.now() - start)
      console.error(`[REQ ${elapsed}ms] ${method} ${pathname} ❌ ${e?.message ?? e}`)
      throw e
    }
  }
}
