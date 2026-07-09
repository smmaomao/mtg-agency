import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'

const POSTBACK_BASE = 'http://postback.mintegral.net'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  // 1. 提取参数（IP 由调用方通过参数上报）
  const clientIp = searchParams.get('ip') || null
  const campuuid = searchParams.get('campuuid') || ''
  const clickid = searchParams.get('clickid') || ''
  const eventType = searchParams.get('event_type') || searchParams.get('type') || ''
  const eventName = searchParams.get('event_name') || ''
  const eventValue = searchParams.get('event_value') || null
  const idfa = searchParams.get('idfa') || null
  const gaid = searchParams.get('gaid') || null
  const userAgent = request.headers.get('user-agent') || null

  // 2. 确定转发地址
  const forwardUrl = eventType === 'install'
    ? `${POSTBACK_BASE}/install`
    : `${POSTBACK_BASE}/event`

  // 3. 记录日志
  const { data: log, error: logError } = await supabase
    .from('callback_logs')
    .insert({
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
      request_body: JSON.stringify(Object.fromEntries(searchParams)),
      response_code: null,
      response_time: null,
      http_status: null,
      status: 'pending',
      ip_address: clientIp,
      response_body: null,
      callback_data: eventValue,
    })
    .select('id')
    .single()

  if (logError) {
    console.error('[events] Log failed:', logError.message)
    return NextResponse.json({ error: '日志记录失败' }, { status: 500 })
  }

  // 4. 转发
  const forwardParams = new URLSearchParams()
  for (const [key, value] of searchParams.entries()) {
    forwardParams.set(key, value)
  }
  if (!forwardParams.has('campuuid') && campuuid) forwardParams.set('campuuid', campuuid)
  if (!forwardParams.has('clickid') && clickid) forwardParams.set('clickid', clickid)

  const fullForwardUrl = `${forwardUrl}?${forwardParams.toString()}`

  // 5. 执行转发
  try {
    const t0 = Date.now()
    const forwardResponse = await fetch(fullForwardUrl, {
      method: 'GET',
      headers: { 'User-Agent': userAgent || 'MTG-Callback/1.0' },
      signal: AbortSignal.timeout(10000),
    })
    const elapsed = Date.now() - t0
    const responseBody = await forwardResponse.text().catch(() => null)

    await supabase
      .from('callback_logs')
      .update({
        response_code: forwardResponse.status,
        http_status: forwardResponse.status,
        response_body: responseBody,
        response_time: elapsed,
        status: forwardResponse.ok ? 'success' : 'failed',
      })
      .eq('id', log.id)

    console.log(`[events] ${clientIp} | ${eventType} | ${forwardResponse.status} | ${elapsed}ms`)

  } catch (err) {
    console.error('[events] Forward failed:', err)

    await supabase
      .from('callback_logs')
      .update({
        status: 'failed',
        response_body: err instanceof Error ? err.message : 'timeout',
      })
      .eq('id', log.id)

    return NextResponse.json({ error: '转发失败' }, { status: 502 })
  }

  return NextResponse.redirect(fullForwardUrl, 302)
}
