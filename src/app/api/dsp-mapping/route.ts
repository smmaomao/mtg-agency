import { withTiming } from '../../../lib/timing'
import { NextResponse } from 'next/server'
import { query, insert, update, del, count } from '@/lib/db'
import { logAudit } from '@/lib/audit'
import { invalidatePwaCache } from '@/lib/pwaMapping'

export const GET = withTiming(async (request: Request) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const from = (page - 1) * pageSize

  try {
    const data = await query(`
      SELECT d.*, p.name as package_name, p.package_name as pkg_name, p.platform
      FROM mtg_agency.packages_dsp_mapping d
      LEFT JOIN mtg_agency.app_packages p ON d.package_id = p.id
      ORDER BY d.id ASC LIMIT $1 OFFSET $2
    `, [pageSize, from])
    const total = await count('mtg_agency.packages_dsp_mapping')
    return NextResponse.json({ data, total, page, pageSize })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

})

export const POST = withTiming(async (request: Request) => {
  const body = await request.json()
  try {
    const data = await insert('mtg_agency.packages_dsp_mapping', {
      customer_id: body.customer_id || null,
      product_id: body.product_id || null,
      package_id: body.package_id,
      dsp_name: body.dsp_name,
      channel_name: body.channel_name || null,
      dsp_package_id: body.dsp_package_id || null,
      campuuid: body.campuuid || null,
      landing_page_url: body.landing_page_url || null,
      status: body.status || 'active',
      remark: body.remark || null,
      is_pwa: body.is_pwa ? true : false,
    })
    await logAudit({ action: 'create', target_table: 'packages_dsp_mapping', target_id: data?.id, detail: `新建映射: ${body.dsp_name}` })
    invalidatePwaCache()
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

})

export const PUT = withTiming(async (request: Request) => {
  const body = await request.json()
  try {
    const data = await update('mtg_agency.packages_dsp_mapping', {
      customer_id: body.customer_id || null,
      product_id: body.product_id || null,
      package_id: body.package_id,
      dsp_name: body.dsp_name,
      channel_name: body.channel_name || null,
      dsp_package_id: body.dsp_package_id || null,
      campuuid: body.campuuid || null,
      landing_page_url: body.landing_page_url || null,
      status: body.status || 'active',
      remark: body.remark || null,
      is_pwa: body.is_pwa ? true : false,
      updated_at: new Date().toISOString(),
    }, 'id = $1', [body.id])
    await logAudit({ action: 'update', target_table: 'packages_dsp_mapping', target_id: body.id, detail: `更新映射: ${body.dsp_name}` })
    invalidatePwaCache()
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

})

export const DELETE = withTiming(async (request: Request) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少ID' }, { status: 400 })

  try {
    await del('mtg_agency.packages_dsp_mapping', 'id = $1', [parseInt(id)])
    await logAudit({ action: 'delete', target_table: 'packages_dsp_mapping', target_id: parseInt(id), detail: `删除映射 ID:${id}` })
    invalidatePwaCache()
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

})
