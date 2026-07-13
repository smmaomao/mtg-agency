// 请求级计时装饰器：包裹 route handler，打印整请求耗时 + 真实状态码
// 同时用 AsyncLocalStorage 注入 requestId，使 DB 日志能与请求关联（类似 Java ThreadLocal）
import { randomUUID } from 'crypto'
import { requestStore } from '@/lib/request-context'

type Handler = (...args: any[]) => Promise<Response> | Response

export function withTiming(handler: Handler): Handler {
  return async (...args: any[]) => {
    const req = args[0] as (Request & { nextUrl?: URL }) | undefined
    const method = req?.method ?? '?'
    const pathname = req?.nextUrl?.pathname ?? '?'
    const requestId = randomUUID().slice(0, 8)

    // 在当前请求的 async 调用链中挂上上下文，DB 层可自动读取
    return requestStore.run({ requestId, method, path: pathname }, async () => {
      const start = performance.now()
      try {
        const res = await handler(...args)
        const elapsed = Math.round(performance.now() - start)
        console.log(`[REQ ${elapsed}ms] ${method} ${pathname} → ${res?.status ?? '?'} (rid=${requestId})`)
        return res
      } catch (e: any) {
        const elapsed = Math.round(performance.now() - start)
        console.error(`[REQ ${elapsed}ms] ${method} ${pathname} ❌ ${e?.message ?? e} (rid=${requestId})`)
        throw e
      }
    })
  }
}
