import { NextResponse } from 'next/server'
import { query, insert, update, del, count } from '@/lib/db'
import { logAudit } from '@/lib/audit'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const from = (page - 1) * pageSize

  try {
    const data = await query(`
      SELECT p.*, pr.name as product_name
      FROM mtg_agency.app_packages p
      LEFT JOIN mtg_agency.products pr ON p.product_id = pr.id
      ORDER BY p.id ASC LIMIT $1 OFFSET $2
    `, [pageSize, from])
    const total = await count('mtg_agency.app_packages')
    return NextResponse.json({ data, total, page, pageSize })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const body = await request.json()
  try {
    const data = await insert('mtg_agency.app_packages', {
      product_id: body.product_id,
      name: body.name,
      platform: body.platform || 'android',
      version: body.version || null,
      download_url: body.download_url || null,
      icon_url: body.icon_url || null,
      remark: body.remark || null,
      package_name: body.package_name || null,
      landing_page_url: body.landing_page_url || null,
    })
    await logAudit({ action: 'create', target_table: 'app_packages', target_id: data?.id, detail: `新建包体: ${body.name}` })
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const body = await request.json()
  try {
    const data = await update('mtg_agency.app_packages', {
      product_id: body.product_id,
      name: body.name,
      platform: body.platform || 'android',
      version: body.version || null,
      download_url: body.download_url || null,
      icon_url: body.icon_url || null,
      remark: body.remark || null,
      package_name: body.package_name || null,
      landing_page_url: body.landing_page_url || null,
      updated_at: new Date().toISOString(),
    }, 'id = $1', [body.id])
    await logAudit({ action: 'update', target_table: 'app_packages', target_id: body.id, detail: `更新包体: ${body.name}` })
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少ID' }, { status: 400 })

  try {
    await del('mtg_agency.app_packages', 'id = $1', [parseInt(id)])
    await logAudit({ action: 'delete', target_table: 'app_packages', target_id: parseInt(id), detail: `删除包体 ID:${id}` })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
