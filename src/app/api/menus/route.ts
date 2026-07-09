import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

export async function GET() {
  const { data, error } = await supabase
    .from('admin_menus')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const body = await request.json()

  const { data, error } = await supabase
    .from('admin_menus')
    .insert({
      name: body.name,
      path: body.path || '',
      icon: body.icon || '',
      parent_id: body.parent_id || 0,
      sort_order: body.sort_order || 0,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logAudit({ action: 'create', target_table: 'admin_menus', target_id: data.id, detail: `新建菜单: ${body.name}` })

  return NextResponse.json({ data })
}

export async function PUT(request: Request) {
  const body = await request.json()

  const { data, error } = await supabase
    .from('admin_menus')
    .update({
      name: body.name,
      path: body.path || '',
      icon: body.icon || '',
      parent_id: body.parent_id || 0,
      sort_order: body.sort_order || 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', body.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logAudit({ action: 'update', target_table: 'admin_menus', target_id: body.id, detail: `更新菜单: ${body.name}` })

  return NextResponse.json({ data })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: '缺少ID' }, { status: 400 })
  }

  const { error } = await supabase
    .from('admin_menus')
    .delete()
    .eq('id', parseInt(id))

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logAudit({ action: 'delete', target_table: 'admin_menus', target_id: parseInt(id), detail: `删除菜单 ID:${id}` })

  return NextResponse.json({ success: true })
}
