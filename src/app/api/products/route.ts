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
    .from('products')
    .select(`
      *,
      customers:customer_id (name)
    `, { count: 'exact' })
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
    .from('products')
    .insert({
      name: body.name,
      customer_id: body.customer_id,
      product_type: body.product_type || 'game',
      remark: body.remark || null,
      icon_url: body.icon_url || null,
      description: body.description || null,
      countries: body.countries || null,
    })
    .select(`
      *,
      customers:customer_id (name)
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logAudit({ action: 'create', target_table: 'products', target_id: data.id, detail: `新建产品: ${body.name}` })

  return NextResponse.json({ data })
}

export async function PUT(request: Request) {
  const body = await request.json()

  const { data, error } = await supabase
    .from('products')
    .update({
      name: body.name,
      customer_id: body.customer_id,
      product_type: body.product_type || 'game',
      remark: body.remark || null,
      icon_url: body.icon_url || null,
      description: body.description || null,
      countries: body.countries || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', body.id)
    .select(`
      *,
      customers:customer_id (name)
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logAudit({ action: 'update', target_table: 'products', target_id: body.id, detail: `更新产品: ${body.name}` })

  return NextResponse.json({ data })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: '缺少ID' }, { status: 400 })
  }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', parseInt(id))

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logAudit({ action: 'delete', target_table: 'products', target_id: parseInt(id), detail: `删除产品 ID:${id}` })

  return NextResponse.json({ success: true })
}
