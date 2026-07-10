/**
 * Mintegral 广告投放数据报表 API 客户端
 * 文档: https://helpcenter.mintegral.com/cn/docs/advanced-ad-delivery-report
 *
 * 两步流程:
 *   1. type=1 提交请求，轮询直到 code=200（数据就绪）
 *   2. type=2 下载 TSV 数据
 */

const API_BASE = 'https://ss-api.mintegral.com/api/v2/reports/data'

function getToken(): string {
  const token = process.env.MINTEGRAL_API_TOKEN
  if (!token) throw new Error('MINTEGRAL_API_TOKEN 未配置')
  return token
}

/**
 * 构建请求 URL
 */
function buildUrl(params: Record<string, string>): string {
  const url = new URL(API_BASE)
  url.searchParams.set('api_token', getToken())
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, v)
    }
  }
  return url.toString()
}

/**
 * Step 1: 提交报表生成请求，返回状态码
 *   code=200 数据就绪
 *   code=201 已接受，等待中
 *   code=202 数据生成中
 *   其他 = 错误
 */
export async function submitReport(params: {
  start_time: string
  end_time: string
  dimension_option: string
  package_ids?: string
  currency?: string
  timezone?: string
}): Promise<{ code: number; message?: string }> {
  const url = buildUrl({
    type: '1',
    start_time: params.start_time,
    end_time: params.end_time,
    dimension_option: params.dimension_option,
    package_ids: params.package_ids || '',
    currency: params.currency || 'USD',
    timezone: params.timezone || '8',
  })

  const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
  if (!res.ok) throw new Error(`Mintegral 请求失败: HTTP ${res.status}`)

  const data = await res.json()
  return { code: data.code, message: data.message }
}

/**
 * Step 2: 下载 TSV 数据
 */
export async function downloadReport(params: {
  start_time: string
  end_time: string
  dimension_option: string
  package_ids?: string
  currency?: string
  timezone?: string
}): Promise<string> {
  const url = buildUrl({
    type: '2',
    start_time: params.start_time,
    end_time: params.end_time,
    dimension_option: params.dimension_option,
    package_ids: params.package_ids || '',
    currency: params.currency || 'USD',
    timezone: params.timezone || '8',
  })

  const res = await fetch(url, { signal: AbortSignal.timeout(60000) })
  if (!res.ok) throw new Error(`Mintegral 下载失败: HTTP ${res.status}`)

  return res.text()
}

/**
 * 解析 TSV 为对象数组
 */
export function parseTsv(tsv: string): Record<string, string>[] {
  const lines = tsv.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split('\t').map(h => h.trim())
  return lines.slice(1).map(line => {
    const values = line.split('\t')
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = (values[i] || '').trim() })
    return row
  })
}

/**
 * 轮询等待报表就绪，最多等待 maxWait 秒
 */
export async function waitForReport(params: {
  start_time: string
  end_time: string
  dimension_option: string
  package_ids?: string
  currency?: string
  timezone?: string
}, maxWait: number = 300, interval: number = 10): Promise<void> {
  const deadline = Date.now() + maxWait * 1000

  while (Date.now() < deadline) {
    const { code } = await submitReport(params)
    if (code === 200) return // 数据就绪
    if (code !== 201 && code !== 202) {
      throw new Error(`Mintegral 报表生成失败，code=${code}`)
    }
    await new Promise(r => setTimeout(r, interval * 1000))
  }

  throw new Error('Mintegral 报表生成超时')
}
