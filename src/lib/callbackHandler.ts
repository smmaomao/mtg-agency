import { NextResponse } from 'next/server'
import { insert, update } from '@/lib/db'
import { isPwaInstall } from '@/lib/pwaMapping'

const POSTBACK_BASE = 'http://postback.mintegral.net'

// 解析 boolean 型 query 参数：true/1/yes -> true；false/0/no -> false；其它/缺失 -> null
function parseBoolParam(raw: string | null): boolean | null {
  if (raw == null) return null
  const v = raw.trim().toLowerCase()
  if (v === 'true' || v === '1' || v === 'yes') return true
  if (v === 'false' || v === '0' || v === 'no') return false
  return null
}

async function forwardToMintegral(
  eventType: string,
  params: URLSearchParams,
  clientIp: string | null,
  userAgent: string | null,
  logId: number,
): Promise<boolean> {
  const forwardUrl = eventType === 'install'
    ? `${POSTBACK_BASE}/install`
    : `${POSTBACK_BASE}/event`
  const fullForwardUrl = `${forwardUrl}?${params.toString()}`

  // 默认走真实转发；仅当显式开启 MOCK_FORWARD=true（本地开发）时才跳过
  // Mintegral 转发并直接标记成功。线上未配置该变量，安全走真实转发。
  if (process.env.MOCK_FORWARD === 'true') {
    await update('mtg_agency.callback_logs', {
      response_code: 200,
      http_status: 200,
      response_body: 'local-mock-success',
      response_time: 0,
      status: 'success',
    }, 'id = $1', [logId])
    console.log(`[events] ${clientIp} | ${eventType} | LOCAL MOCK success`)
    return true
  }

  try {
    const t0 = Date.now()
    const forwardResponse = await fetch(fullForwardUrl, {
      method: 'GET',
      headers: { 'User-Agent': userAgent || 'MTG-Callback/1.0' },
      signal: AbortSignal.timeout(10000),
    })
    const elapsed = Date.now() - t0
    const responseBody = await forwardResponse.text().catch(() => null)

    await update('mtg_agency.callback_logs', {
      response_code: forwardResponse.status,
      http_status: forwardResponse.status,
      response_body: responseBody,
      response_time: elapsed,
      status: forwardResponse.ok ? 'success' : 'failed',
    }, 'id = $1', [logId])

    console.log(`[events] ${clientIp} | ${eventType} | ${forwardResponse.status} | ${elapsed}ms`)
    return true
  } catch (err) {
    console.error('[events] Forward failed:', err)

    await update('mtg_agency.callback_logs', {
      status: 'failed',
      response_body: err instanceof Error ? err.message : 'timeout',
    }, 'id = $1', [logId])

    return false
  }
}

export async function handleCallback(request: Request, eventType: string) {
  const { searchParams } = new URL(request.url)

  // 回传端点不做 token 校验：来源为 Adjust 等 MMP，不携带我方 token，需原样透传
  // 提取参数
  const clientIp = searchParams.get('ip') || null
  const campuuid = searchParams.get('campuuid') || ''
  const clickid = searchParams.get('clickid') || ''
  const eventName = searchParams.get('event_name') || ''
  const eventValue = searchParams.get('event_value') || null
  const idfa = searchParams.get('idfa') || null
  const gaid = searchParams.get('gaid') || null
  const userAgent = request.headers.get('user-agent') || null
  // 接口直接传入的 PWA 标记（可选）；缺失时回退到 campuuid 反查
  const isPwaParam = parseBoolParam(searchParams.get('is_pwa'))

  // 记录日志（去掉 token 参数）
  const logParams = Object.fromEntries(searchParams.entries())
  delete logParams.token

  const log = await insert<{ id: number }>('mtg_agency.callback_logs', {
    mapping_id: null,
    event_type: eventType,
    event_name: eventName || null,
    click_id: clickid,
    pixel_id: campuuid,
    idfa,
    gaid,
    package_name: null,
    standard_event_code: null,
    request_url: request.url,
    request_body: JSON.stringify(logParams),
    response_code: null,
    response_time: null,
    http_status: null,
    status: 'pending',
    ip_address: clientIp,
    response_body: null,
    callback_data: eventValue,
  })

  if (!log) {
    return NextResponse.json({ error: '日志记录失败' }, { status: 500 })
  }

  // 转发（去掉 token / is_pwa 参数，不传给下游；is_pwa 仅用于本服务决策）
  const forwardParams = new URLSearchParams()
  for (const [key, value] of searchParams.entries()) {
    if (key !== 'token' && key !== 'is_pwa') forwardParams.set(key, value)
  }
  if (!forwardParams.has('campuuid') && campuuid) forwardParams.set('campuuid', campuuid)
  if (!forwardParams.has('clickid') && clickid) forwardParams.set('clickid', clickid)

  // 转发主事件（网络异常才返回 502，HTTP 错误状态仅记录日志）
  const ok = await forwardToMintegral(eventType, forwardParams, clientIp, userAgent, log.id)
  if (!ok) {
    return NextResponse.json({ error: '转发失败' }, { status: 502 })
  }

  // PWA 包：install 上报时同时上报激活 app_open
  if (eventType === 'install') {
    // 优先使用接口传入的 is_pwa，未传则回退到 campuuid 反查（兼容旧链路）
    const isPwa = isPwaParam != null ? isPwaParam : await isPwaInstall(campuuid)
    if (isPwa) {
      const appOpenParams = new URLSearchParams(forwardParams)
      appOpenParams.set('event_name', 'app_open')
      if (!appOpenParams.has('event_time')) {
        const installTime = searchParams.get('install_time')
        appOpenParams.set('event_time', installTime || String(Math.floor(Date.now() / 1000)))
      }

      const appOpenLog = await insert<{ id: number }>('mtg_agency.callback_logs', {
        mapping_id: null,
        event_type: 'event',
        event_name: 'app_open',
        click_id: clickid,
        pixel_id: campuuid,
        idfa,
        gaid,
        package_name: null,
        standard_event_code: null,
        request_url: `${POSTBACK_BASE}/event?${appOpenParams.toString()}`,
        request_body: JSON.stringify(Object.fromEntries(appOpenParams.entries())),
        response_code: null,
        response_time: null,
        http_status: null,
        status: 'pending',
        ip_address: clientIp,
        response_body: null,
        callback_data: null,
      })

      if (appOpenLog) {
        // 激活上报失败不影响主 install 响应
        await forwardToMintegral('event', appOpenParams, clientIp, userAgent, appOpenLog.id)
      }
    }
  }

  return NextResponse.json({ success: true })
}
