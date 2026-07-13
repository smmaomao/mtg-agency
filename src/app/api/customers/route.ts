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
    const data = await query('SELECT * FROM mtg_agency.customers ORDER BY id ASC LIMIT $1 OFFSET $2', [pageSize, from])
    const total = await count('mtg_agency.customers')
    return NextResponse.json({ data, total, page, pageSize })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

})

export const POST = withTiming(async (request: Request) => {
  const body = await request.json()
  try {
    const data = await insert('mtg_agency.customers', {
      name: body.name,
      contact_person: body.contact_person || null,
      contact_phone: body.contact_phone || null,
      email: body.email || null,
      open_date: body.open_date,
      remark: body.remark || null,
    })
    await logAudit({ action: 'create', target_table: 'customers', target_id: data?.id, detail: `新建客户: ${body.name}` })
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

})

export const PUT = withTiming(async (request: Request) => {
  const body = await request.json()
  try {
    const data = await update('mtg_agency.customers', {
      name: body.name,
      contact_person: body.contact_person || null,
      contact_phone: body.contact_phone || null,
      email: body.email || null,
      open_date: body.open_date,
      remark: body.remark || null,
      updated_at: new Date().toISOString(),
    }, 'id = $1', [body.id])
    await logAudit({ action: 'update', target_table: 'customers', target_id: body.id, detail: `更新客户: ${body.name}` })
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
    await del('mtg_agency.customers', 'id = $1', [parseInt(id)])
    await logAudit({ action: 'delete', target_table: 'customers', target_id: parseInt(id), detail: `删除客户 ID:${id}` })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    const status = error.friendly ? 400 : 500
    return NextResponse.json({ error: error.message }, { status })
  }

})
