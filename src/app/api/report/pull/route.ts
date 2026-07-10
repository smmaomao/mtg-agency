import { NextResponse } from 'next/server'
import { queryOne, insert, update } from '@/lib/db'
import { submitReport, downloadReport, parseTsv, waitForReport } from '@/lib/mintegral'

/**
 * POST /api/report/pull
 *
 * 触发报表拉取
 *
 * 参数:
 *   package_id   必填，包体 ID
 *   report_date  必填，报表日期 YYYY-MM-DD
 *   callback_url 可选，回调地址
 */
export async function POST(request: Request) {
  const body = await request.json()
  const { package_id, report_date, callback_url } = body

  if (!package_id || !report_date) {
    return NextResponse.json({ error: '缺少必填参数: package_id, report_date' }, { status: 400 })
  }

  // 获取客户端 IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'

  // 检查是否已有该包+日期的请求记录
  const existing = await queryOne<{
    id: number; status: string; total_rows: number; file_count: number; error_message: string | null
  }>(
    'SELECT id, status, total_rows, file_count, error_message FROM mtg_agency.report_pull_logs WHERE mapping_id = $1 AND report_date = $2 ORDER BY id DESC LIMIT 1',
    [package_id, report_date]
  )

  // 如果已有记录且状态为 success，直接返回数据
  if (existing && existing.status === 'success' && existing.total_rows > 0) {
    return NextResponse.json({
      status: 'completed',
      message: '数据已拉取完成',
      log_id: existing.id,
      total_rows: existing.total_rows,
      file_count: existing.file_count,
    })
  }

  // 如果已有记录且状态为 running，返回拉取中
  if (existing && existing.status === 'running') {
    return NextResponse.json({
      status: 'fetching',
      message: '还在拉取中，请过一段时间再来',
      log_id: existing.id,
    })
  }

  // 如果已有记录且状态为 failed，可以重试（创建新记录）
  // 否则创建新记录
  const log = await insert<{ id: number }>('mtg_agency.report_pull_logs', {
    mapping_id: package_id,
    report_type: 'mintegral_daily',
    report_date,
    pull_params: JSON.stringify({ package_id, report_date, callback_url }),
    status: 'running',
    ip_address: ip,
    callback_url: callback_url || null,
    file_count: 0,
    total_rows: 0,
    started_at: new Date().toISOString(),
  })

  if (!log) {
    return NextResponse.json({ error: '创建日志失败' }, { status: 500 })
  }

  // 异步执行报表拉取（不阻塞响应）
  pullReport(log.id, package_id, report_date).catch(err => {
    console.error('[report/pull] Async pull failed:', err)
  })

  return NextResponse.json({
    status: 'started',
    message: '报表拉取已开始，请稍后再来查询',
    log_id: log.id,
  })
}

/**
 * GET /api/report/pull?log_id=xxx
 *
 * 查询拉取状态和结果
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const logId = searchParams.get('log_id')
  const packageId = searchParams.get('package_id')
  const reportDate = searchParams.get('report_date')

  // 按 log_id 查询
  if (logId) {
    const log = await queryOne(
      'SELECT * FROM mtg_agency.report_pull_logs WHERE id = $1',
      [parseInt(logId)]
    )
    if (!log) return NextResponse.json({ error: '记录不存在' }, { status: 404 })
    return NextResponse.json({ data: log })
  }

  // 按 package_id + report_date 查询
  if (packageId && reportDate) {
    const log = await queryOne(
      'SELECT * FROM mtg_agency.report_pull_logs WHERE mapping_id = $1 AND report_date = $2 ORDER BY id DESC LIMIT 1',
      [parseInt(packageId), reportDate]
    )
    if (!log) return NextResponse.json({ data: null })
    return NextResponse.json({ data: log })
  }

  return NextResponse.json({ error: '请提供 log_id 或 package_id + report_date' }, { status: 400 })
}

/**
 * 实际执行报表拉取（异步）
 */
async function pullReport(logId: number, packageId: number, reportDate: string) {
  const startTime = `${reportDate} 00:00:00`
  const endTime = `${reportDate} 23:59:59`

  const pullParams = {
    start_time: startTime,
    end_time: endTime,
    dimension_option: 'package',
    package_ids: String(packageId),
  }

  try {
    // Step 1: 提交请求并等待就绪（最多等 5 分钟）
    await waitForReport(pullParams, 300, 15)

    // Step 2: 下载数据
    const tsv = await downloadReport(pullParams)
    const rows = parseTsv(tsv)

    // 更新日志
    await update('mtg_agency.report_pull_logs', {
      status: 'success',
      file_count: 1,
      total_rows: rows.length,
      finished_at: new Date().toISOString(),
    }, 'id = $1', [logId])

    console.log(`[report/pull] 完成: log=${logId}, rows=${rows.length}`)

    // 如果有回调地址，通知上游
    const log = await queryOne<{ callback_url: string | null }>(
      'SELECT callback_url FROM mtg_agency.report_pull_logs WHERE id = $1',
      [logId]
    )
    if (log?.callback_url) {
      try {
        await fetch(log.callback_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ log_id: logId, status: 'success', total_rows: rows.length }),
          signal: AbortSignal.timeout(10000),
        })
      } catch {
        // 回调失败不影响主流程
      }
    }

  } catch (err: any) {
    console.error('[report/pull] Failed:', err.message)
    await update('mtg_agency.report_pull_logs', {
      status: 'failed',
      error_message: err.message,
      finished_at: new Date().toISOString(),
    }, 'id = $1', [logId])
  }
}
