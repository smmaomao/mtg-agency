import { NextResponse } from 'next/server'
import { fetchMintegralReport, type MintegralReportParams, DimensionOption } from '@/lib/mintegral'

/**
 * GET /api/mintegral-reports
 *
 * 查询参数:
 *   start_time      必填，开始时间 YYYY-MM-DD HH:mm:ss (UTC)
 *   end_time        必填，结束时间 YYYY-MM-DD HH:mm:ss (UTC)，间隔 ≤ 7 天
 *   dimension       必填，报表维度: offer / campaign / country / platform / package / ad_type / daily
 *   currency        可选，货币单位，默认 USD
 *   timezone        可选，时区偏移，默认 0 (UTC+0)
 *   package_ids     可选，包体 ID 过滤 (逗号分隔)
 *   offer_ids       可选，Offer ID 过滤 (逗号分隔)
 *   campaign_ids    可选，Campaign ID 过滤 (逗号分隔)
 *   countries       可选，国家过滤 (逗号分隔)
 *   platform        可选，平台过滤: ios / android
 *   ad_type         可选，广告类型过滤
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const start_time = searchParams.get('start_time')
  const end_time = searchParams.get('end_time')
  const dimension = searchParams.get('dimension')

  if (!start_time || !end_time) {
    return NextResponse.json({ error: '缺少必填参数: start_time, end_time' }, { status: 400 })
  }

  if (!dimension) {
    return NextResponse.json({ error: '缺少必填参数: dimension' }, { status: 400 })
  }

  // 校验 dimension 合法性
  const validDimensions = Object.values(DimensionOption)
  if (!validDimensions.includes(dimension as any)) {
    return NextResponse.json({
      error: `无效的 dimension: ${dimension}，有效值: ${validDimensions.join(', ')}`,
    }, { status: 400 })
  }

  const params: MintegralReportParams = {
    start_time,
    end_time,
    dimension_option: dimension,
    currency: searchParams.get('currency') || undefined,
    timezone: searchParams.get('timezone') ? parseInt(searchParams.get('timezone')!) : undefined,
    package_ids: searchParams.get('package_ids') || undefined,
    offer_ids: searchParams.get('offer_ids') || undefined,
    campaign_ids: searchParams.get('campaign_ids') || undefined,
    countries: searchParams.get('countries') || undefined,
    platform: searchParams.get('platform') || undefined,
    ad_type: searchParams.get('ad_type') || undefined,
  }

  try {
    const result = await fetchMintegralReport(params)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[mintegral-reports]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
