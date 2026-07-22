import { NextResponse } from 'next/server'
import { insert, update } from '@/lib/db'

const POSTBACK_BASE = 'http://postback.mintegral.net'

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

  const forwardUrl = eventType === 'install'
    ? `${POSTBACK_BASE}/install`
    : `${POSTBACK_BASE}/event`

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

  // 转发（去掉 token 参数，不传给下游）
  const forwardParams = new URLSearchParams()
  for (const [key, value] of searchParams.entries()) {
    if (key !== 'token') forwardParams.set(key, value)
  }
  if (!forwardParams.has('campuuid') && campuuid) forwardParams.set('campuuid', campuuid)
  if (!forwardParams.has('clickid') && clickid) forwardParams.set('clickid', clickid)

  const fullForwardUrl = `${forwardUrl}?${forwardParams.toString()}`

  // 默认走真实转发；仅当显式开启 MOCK_FORWARD=true（本地开发）时才跳过
  // Mintegral 转发并直接标记成功。线上未配置该变量，安全走真实转发。
  if (process.env.MOCK_FORWARD === 'true') {
    await update('mtg_agency.callback_logs', {
      response_code: 200,
      http_status: 200,
      response_body: 'local-mock-success',
      response_time: 0,
      status: 'success',
    }, 'id = $1', [log.id])
    console.log(`[events] ${clientIp} | ${eventType} | LOCAL MOCK success`)
    return NextResponse.json({ success: true })
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
    }, 'id = $1', [log.id])

    console.log(`[events] ${clientIp} | ${eventType} | ${forwardResponse.status} | ${elapsed}ms`)

  } catch (err) {
    console.error('[events] Forward failed:', err)

    await update('mtg_agency.callback_logs', {
      status: 'failed',
      response_body: err instanceof Error ? err.message : 'timeout',
    }, 'id = $1', [log.id])

    return NextResponse.json({ error: '转发失败' }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
