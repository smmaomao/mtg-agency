import { withTiming } from '../../../lib/timing'
import { NextResponse } from 'next/server'
import { query, insert, update, del, count } from '@/lib/db'
import { logAudit } from '@/lib/audit'

// products.countries 是 TEXT 列，前端传数组，pg 会存成 "{US,CN}" 或 JSON 字符串。
// 这里统一在写入时 JSON.stringify、读出时解析为数组（兼容旧的 {US,CN} 格式），
// 避免前端对字符串调用 .map 报错。
function toCountryArray(v: any): string[] | null {
  if (v == null) return null
  if (Array.isArray(v)) return v
  const s = String(v).trim()
  if (!s) return null
  if (s.startsWith('[')) {
    try { const a = JSON.parse(s); return Array.isArray(a) ? a : null } catch { return null }
  }
  if (s.startsWith('{')) return s.slice(1, -1).split(',').map(x => x.trim()).filter(Boolean)
  return s.split(',').map(x => x.trim()).filter(Boolean)
}

export const GET = withTiming(async (request: Request) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const from = (page - 1) * pageSize

  try {
    const rows = await query(`
      SELECT p.*, c.name as customer_name
      FROM mtg_agency.products p
      LEFT JOIN mtg_agency.customers c ON p.customer_id = c.id
      ORDER BY p.id ASC LIMIT $1 OFFSET $2
    `, [pageSize, from])
    const data = rows.map((p: any) => ({ ...p, countries: toCountryArray(p.countries) }))
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
      countries: body.countries && body.countries.length ? body.countries : null,
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
      countries: body.countries && body.countries.length ? body.countries : null,
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
    const status = error.friendly ? 400 : 500
    return NextResponse.json({ error: error.message }, { status })
  }

})
