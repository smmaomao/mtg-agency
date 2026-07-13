import { withTiming } from '../../../lib/timing'
import { NextResponse } from 'next/server'
import { submitReport, downloadReport, parseTsv } from '@/lib/mintegral'

/**
 * GET /api/mintegral-reports
 *
 * 直接查询 Mintegral 报表（不走 report_pull_logs）
 * 适合临时查询，不适合定期拉取
 */
export const GET = withTiming(async (request: Request) => {
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

  const params = {
    start_time,
    end_time,
    dimension_option: dimension,
    package_ids: searchParams.get('package_ids') || undefined,
    currency: searchParams.get('currency') || undefined,
    timezone: searchParams.get('timezone') || undefined,
  }

  try {
    // Step 1: 提交请求
    const { code } = await submitReport(params)
    if (code !== 200) {
      return NextResponse.json({ status: 'generating', message: '报表生成中，请稍后再试' })
    }

    // Step 2: 下载数据
    const tsv = await downloadReport(params)
    const rows = parseTsv(tsv)

    return NextResponse.json({ data: rows, total: rows.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

})
