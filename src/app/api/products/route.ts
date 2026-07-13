import { withTiming } from '../../../lib/timing'
import { NextResponse } from 'next/server'
import { query, insert, update, del, count } from '@/lib/db'
import { logAudit } from '@/lib/audit'

export const GET = withTiming(async (request: Request) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const from = (page - 1) * pageSize

  try {
    const data = await query(`
      SELECT p.*, c.name as customer_name
      FROM mtg_agency.products p
      LEFT JOIN mtg_agency.customers c ON p.customer_id = c.id
      ORDER BY p.id ASC LIMIT $1 OFFSET $2
    `, [pageSize, from])
    const total = await count('mtg_agency.products')
    return NextResponse.json({ data, total, page, pageSize })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

})

export const POST = withTiming(async (request: Request) => {
  const body = await request.json()
  try {
    const data = await insert('mtg_agency.products', {
      name: body.name,
      customer_id: body.customer_id,
      product_type: body.product_type || 'game',
      remark: body.remark || null,
      icon_url: body.icon_url || null,
      description: body.description || null,
      countries: body.countries || null,
    })
    await logAudit({ action: 'create', target_table: 'products', target_id: data?.id, detail: `新建产品: ${body.name}` })
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

})

export const PUT = withTiming(async (request: Request) => {
  const body = await request.json()
  try {
    const data = await update('mtg_agency.products', {
      name: body.name,
      customer_id: body.customer_id,
      product_type: body.product_type || 'game',
      remark: body.remark || null,
      icon_url: body.icon_url || null,
      description: body.description || null,
      countries: body.countries || null,
      updated_at: new Date().toISOString(),
    }, 'id = $1', [body.id])
    await logAudit({ action: 'update', target_table: 'products', target_id: body.id, detail: `更新产品: ${body.name}` })
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
    await del('mtg_agency.products', 'id = $1', [parseInt(id)])
    await logAudit({ action: 'delete', target_table: 'products', target_id: parseInt(id), detail: `删除产品 ID:${id}` })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

})
