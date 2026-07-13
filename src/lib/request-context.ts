import { AsyncLocalStorage } from 'async_hooks'

export interface RequestContext {
  requestId: string
  method?: string
  path?: string
}

// 每个 HTTP 请求的独立存储，等价于 Java 的 ThreadLocal
// 在 withTiming 中 run，DB 层 getRequestContext() 即可拿到当前请求的 requestId
export const requestStore = new AsyncLocalStorage<RequestContext>()

export function getRequestContext(): RequestContext | undefined {
  return requestStore.getStore()
}
