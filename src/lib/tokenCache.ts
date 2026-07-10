import { query } from '@/lib/db'

// 内存缓存：只存储启用的 token
let tokenCache: Set<string> | null = null
let lastLoadTime = 0
const CACHE_TTL = 3600_000 // 1小时刷新一次

/**
 * 获取所有启用的 token（优先从缓存读取）
 */
export async function getValidTokens(): Promise<Set<string>> {
  const now = Date.now()

  // 缓存有效，直接返回
  if (tokenCache && now - lastLoadTime < CACHE_TTL) {
    return tokenCache
  }

  // 重新加载
  await refreshCache()
  return tokenCache!
}

/**
 * 刷新缓存（从数据库加载）
 */
export async function refreshCache() {
  try {
    const rows = await query<{ token: string }>(
      'SELECT token FROM mtg_agency.ip_whitelist WHERE status = 1'
    )
    tokenCache = new Set(rows.map(r => r.token))
    lastLoadTime = Date.now()
    console.log(`[tokenCache] Refreshed: ${tokenCache.size} tokens`)
  } catch (err) {
    console.error('[tokenCache] Refresh failed:', err)
    // 如果加载失败，保持旧缓存
    if (!tokenCache) tokenCache = new Set()
  }
}

/**
 * 验证 token 是否有效
 * 规则：
 * - 如果没有配置任何 token → 放行所有请求
 * - 如果配置了 token → 只有匹配的才放行
 */
export async function validateToken(token: string): Promise<boolean> {
  const tokens = await getValidTokens()

  // 没有配置任何 token，不需要验证
  if (tokens.size === 0) {
    return true
  }

  // 配置了 token，必须匹配
  return tokens.has(token)
}
