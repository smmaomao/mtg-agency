import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .order('id', { ascending: true })
    .range(from, to)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, total: count, page, pageSize })
}

export async function POST(request: Request) {
  const body = await request.json()

  const { data, error } = await supabase
    .from('customers')
    .insert({
      name: body.name,
      contact_person: body.contact_person || null,
      contact_phone: body.contact_phone || null,
      email: body.email || null,
      open_date: body.open_date,
      remark: body.remark || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logAudit({ action: 'create', target_table: 'customers', target_id: data.id, detail: `新建客户: ${body.name}` })

  return NextResponse.json({ data })
}

export async function PUT(request: Request) {
  const body = await request.json()

  const { data, error } = await supabase
    .from('customers')
    .update({
      name: body.name,
      contact_person: body.contact_person || null,
      contact_phone: body.contact_phone || null,
      email: body.email || null,
      open_date: body.open_date,
      remark: body.remark || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', body.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logAudit({ action: 'update', target_table: 'customers', target_id: body.id, detail: `更新客户: ${body.name}` })

  return NextResponse.json({ data })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: '缺少ID' }, { status: 400 })
  }

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', parseInt(id))

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logAudit({ action: 'delete', target_table: 'customers', target_id: parseInt(id), detail: `删除客户 ID:${id}` })

  return NextResponse.json({ success: true })
}
