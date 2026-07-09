import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

export async function GET() {
  const { data, error } = await supabase
    .from('admin_roles')
    .select('*')
    .order('id', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const body = await request.json()

  const { data, error } = await supabase
    .from('admin_roles')
    .insert({
      name: body.name,
      description: body.description || '',
      menu_permissions: body.menu_permissions || [],
      status: body.status ?? 1,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logAudit({ action: 'create', target_table: 'admin_roles', target_id: data.id, detail: `新建角色: ${body.name}` })

  return NextResponse.json({ data })
}

export async function PUT(request: Request) {
  const body = await request.json()

  const { data, error } = await supabase
    .from('admin_roles')
    .update({
      name: body.name,
      description: body.description || '',
      menu_permissions: body.menu_permissions || [],
      status: body.status ?? 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', body.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logAudit({ action: 'update', target_table: 'admin_roles', target_id: body.id, detail: `更新角色: ${body.name}` })

  return NextResponse.json({ data })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: '缺少ID' }, { status: 400 })
  }

  const idNum = parseInt(id)
  if (idNum === 1) {
    return NextResponse.json({ error: '不能删除超级管理员角色' }, { status: 400 })
  }

  const { error } = await supabase
    .from('admin_roles')
    .delete()
    .eq('id', idNum)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logAudit({ action: 'delete', target_table: 'admin_roles', target_id: idNum, detail: `删除角色 ID:${idNum}` })

  return NextResponse.json({ success: true })
}
