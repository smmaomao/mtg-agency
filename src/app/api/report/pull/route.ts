import { withTiming } from '../../../../lib/timing'
import { NextResponse } from 'next/server'
import { queryOne, insert, update } from '@/lib/db'
import { submitReport, downloadReport, parseTsv } from '@/lib/mintegral'

/**
 * POST /api/report/pull
 *
 *   package_id   必填
 *   report_date  必填 YYYY-MM-DD
 *   force        可选，强制重新拉取
 */
export const POST = withTiming(async (request: Request) => {
  const body = await request.json()
  const { package_id, report_date, force } = body

  if (!package_id || !report_date) {
    return NextResponse.json({ error: '缺少必填参数: package_id, report_date' }, { status: 400 })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip') || 'unknown'

  // 查最新记录
  const existing = await queryOne<{
    id: number; status: string; result_data: any
  }>(
    'SELECT id, status, result_data FROM mtg_agency.report_pull_logs WHERE mapping_id = $1 AND report_date = $2 ORDER BY id DESC LIMIT 1',
    [package_id, report_date]
  )

  // 非强制 + 有记录 → 智能处理
  if (!force && existing) {
    // 有结果 → 直接返回
    if (existing.status === 'success' && existing.result_data) {
      return NextResponse.json({ status: 'completed', data: existing.result_data, log_id: existing.id })
    }

    // 拉取中/待处理 → 去 Mintegral 查一下
    if (existing.status === 'running' || existing.status === 'pending') {
      const result = await checkMintegral(package_id, report_date, existing.id)
      if (result) {
        return NextResponse.json({ status: 'completed', data: result, log_id: existing.id })
      }
      return NextResponse.json({ status: 'fetching', message: '正在拉取中，请稍后再来', log_id: existing.id })
    }

    // 失败 → 走下面新建逻辑
  }

  // 新建记录
  const log = await insert<{ id: number }>('mtg_agency.report_pull_logs', {
    mapping_id: package_id,
    report_type: 'mintegral_daily',
    report_date,
    pull_params: JSON.stringify({ package_id, report_date }),
    status: 'pending',
    ip_address: ip,
    file_count: 0,
    total_rows: 0,
    started_at: new Date().toISOString(),
  })

  if (!log) return NextResponse.json({ error: '创建记录失败' }, { status: 500 })

  // 异步拉取
  pullReport(log.id, package_id, report_date).catch(err => {
    console.error('[report/pull] Async failed:', err)
  })

  return NextResponse.json({ status: 'pending', message: '报表拉取已开始，请稍后再来查询', log_id: log.id })
})

/**
 * GET /api/report/pull?package_id=1&report_date=2026-07-10
 */
export const GET = withTiming(async (request: Request) => {
  const { searchParams } = new URL(request.url)
  const logId = searchParams.get('log_id')
  const packageId = searchParams.get('package_id')
  const reportDate = searchParams.get('report_date')

  if (logId) {
    const log = await queryOne('SELECT * FROM mtg_agency.report_pull_logs WHERE id = $1', [parseInt(logId)])
    if (!log) return NextResponse.json({ error: '记录不存在' }, { status: 404 })
    return NextResponse.json({ data: log })
  }

  if (packageId && reportDate) {
    const log = await queryOne(
      'SELECT * FROM mtg_agency.report_pull_logs WHERE mapping_id = $1 AND report_date = $2 ORDER BY id DESC LIMIT 1',
      [parseInt(packageId), reportDate]
    )
    return NextResponse.json({ data: log || null })
  }

  return NextResponse.json({ error: '请提供 log_id 或 package_id + report_date' }, { status: 400 })
})

/** 去 Mintegral 查状态，有结果就下载并更新记录 */
async function checkMintegral(packageId: number, reportDate: string, logId: number) {
  const params = {
    start_time: `${reportDate} 00:00:00`,
    end_time: `${reportDate} 23:59:59`,
    dimension_option: 'package',
    package_ids: String(packageId),
  }
  try {
    const { code } = await submitReport(params)
    if (code !== 200) return null

    const tsv = await downloadReport(params)
    const rows = parseTsv(tsv)

    await update('mtg_agency.report_pull_logs', {
      status: 'success',
      result_data: JSON.stringify(rows),
      file_count: 1,
      total_rows: rows.length,
      finished_at: new Date().toISOString(),
    }, 'id = $1', [logId])

    return rows
  } catch {
    return null
  }
}

/** 异步执行完整拉取流程 */
async function pullReport(logId: number, packageId: number, reportDate: string) {
  const params = {
    start_time: `${reportDate} 00:00:00`,
    end_time: `${reportDate} 23:59:59`,
    dimension_option: 'package',
    package_ids: String(packageId),
  }

  try {
    await update('mtg_agency.report_pull_logs', { status: 'running' }, 'id = $1', [logId])

    // Step 1: 提交
    const { code } = await submitReport(params)
    if (code !== 200) {
      // 轮询最多 5 分钟
      const deadline = Date.now() + 5 * 60 * 1000
      while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 15000))
        const { code: c } = await submitReport(params)
        if (c === 200) break
        if (c !== 201 && c !== 202) throw new Error(`Mintegral 错误 code=${c}`)
      }
    }

    // Step 2: 下载
    const tsv = await downloadReport(params)
    const rows = parseTsv(tsv)

    await update('mtg_agency.report_pull_logs', {
      status: 'success',
      result_data: JSON.stringify(rows),
      file_count: 1,
      total_rows: rows.length,
      finished_at: new Date().toISOString(),
    }, 'id = $1', [logId])

    console.log(`[report/pull] 完成: log=${logId}, rows=${rows.length}`)

    // 回调
    const log = await queryOne<{ callback_url: string | null }>(
      'SELECT callback_url FROM mtg_agency.report_pull_logs WHERE id = $1', [logId]
    )
    if (log?.callback_url) {
      fetch(log.callback_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_id: logId, status: 'success', total_rows: rows.length }),
      }).catch(() => {})
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
