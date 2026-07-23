import { query } from '@/lib/db'

// 缓存「campuuid 模板 -> is_pwa」的映射，避免每次 install 回传都查库。
// 映射表数据量很小，整体载入内存即可；TTL 内复用，过期后惰性刷新。
interface PwaPattern {
  prefix: string
  isPwa: boolean
}

let cache: PwaPattern[] | null = null
let cacheTime = 0
const TTL = 60_000 // 60s

// 把模板里的通配符 `*` 去掉得到前缀；回调 campuuid 以该前缀开头即命中。
// 例：模板 `ss_nusaslots_id7_0713_wbl_*` -> 前缀 `ss_nusaslots_id7_0713_wbl_`
//     回调 `ss_nusaslots_id7_0713_wbl_cpi` 命中。
// 无通配符的精确 campuuid：前缀即模板本身，startsWith 等价于全等。
function buildPrefix(template: string): string {
  return template.replace(/\*/g, '')
}

async function loadCache(): Promise<PwaPattern[]> {
  const rows = await query<{ campuuid: string | null; is_pwa: boolean }>(
    `SELECT campuuid, is_pwa
     FROM mtg_agency.packages_dsp_mapping
     WHERE status = 'active' AND campuuid IS NOT NULL AND campuuid <> ''`
  )
  return rows.map((r) => ({ prefix: buildPrefix(r.campuuid as string), isPwa: r.is_pwa }))
}

/**
 * 判断给定 campuuid 是否对应 PWA 包（install 需同时上报激活）。
 * 查库失败不阻断回传：用旧缓存或空集合兜底。
 */
export async function isPwaInstall(campuuid: string): Promise<boolean> {
  if (!campuuid) return false

  const now = Date.now()
  if (!cache || now - cacheTime > TTL) {
    try {
      cache = await loadCache()
      cacheTime = now
    } catch (err) {
      console.error('[pwaMapping] 加载映射失败，使用旧缓存:', err)
      if (!cache) cache = []
    }
  }

  return cache.some((p) => p.isPwa && p.prefix.length > 0 && campuuid.startsWith(p.prefix))
}

/**
 * 主动清空缓存。映射表发生新增/编辑/删除后调用，使下次回传立即读到最新 is_pwa 配置，
 * 无需等待 60s TTL 过期。（多实例部署下仅清理当前实例；TTL 仍作为兜底。）
 */
export function invalidatePwaCache() {
  cache = null
  cacheTime = 0
}
