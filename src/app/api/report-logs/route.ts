import { withTiming } from '../../../lib/timing'
import { NextResponse } from 'next/server'
import { query, del, count } from '@/lib/db'

export const GET = withTiming(async (request: Request) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const reportType = searchParams.get('report_type')
  const status = searchParams.get('status')
  const mappingId = searchParams.get('mapping_id')
  const from = (page - 1) * pageSize

  let where = '1=1'
  const params: any[] = []
  let idx = 1

  if (reportType) { where += ` AND r.report_type = $${idx++}`; params.push(reportType) }
  if (status) { where += ` AND r.status = $${idx++}`; params.push(status) }
  if (mappingId) { where += ` AND r.mapping_id = $${idx++}`; params.push(parseInt(mappingId)) }

  try {
    const data = await query(`
      SELECT r.*, d.dsp_name, d.channel_name, d.dsp_package_id
      FROM mtg_agency.report_pull_logs r
      LEFT JOIN mtg_agency.packages_dsp_mapping d ON r.mapping_id = d.id
      WHERE ${where}
      ORDER BY r.created_at DESC LIMIT $${idx++} OFFSET $${idx++}
    `, [...params, pageSize, from])
    const total = await count('mtg_agency.report_pull_logs', where.replace(/\br\./g, ''), params)
    return NextResponse.json({ data, total, page, pageSize })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

export const DELETE = withTiming(async (request: Request) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少ID' }, { status: 400 })

  try {
    await del('mtg_agency.report_pull_logs', 'id = $1', [parseInt(id)])
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

})
