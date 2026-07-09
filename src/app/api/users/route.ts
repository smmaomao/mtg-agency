import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { hashPassword } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export async function GET() {
  const { data, error } = await supabase
    .from('admin_users')
    .select('id, username, real_name, role_id, status, created_at')
    .order('id', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const body = await request.json()

  const { data, error } = await supabase
    .from('admin_users')
    .insert({
      username: body.username,
      password_hash: hashPassword(body.password),
      real_name: body.real_name || '',
      role_id: body.role_id || null,
      status: body.status ?? 1,
    })
    .select('id, username, real_name, role_id, status, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '用户名已存在' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logAudit({ action: 'create', target_table: 'admin_users', target_id: data.id, detail: `新建用户: ${body.username}` })

  return NextResponse.json({ data })
}

export async function PUT(request: Request) {
  const body = await request.json()
  const updateData: Record<string, unknown> = {
    real_name: body.real_name || '',
    role_id: body.role_id || null,
    status: body.status ?? 1,
    updated_at: new Date().toISOString(),
  }

  if (body.password) {
    updateData.password_hash = hashPassword(body.password)
  }

  const { data, error } = await supabase
    .from('admin_users')
    .update(updateData)
    .eq('id', body.id)
    .select('id, username, real_name, role_id, status, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logAudit({ action: 'update', target_table: 'admin_users', target_id: body.id, detail: `更新用户 ID:${body.id}` })

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
    return NextResponse.json({ error: '不能删除超级管理员' }, { status: 400 })
  }

  const { error } = await supabase
    .from('admin_users')
    .delete()
    .eq('id', idNum)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logAudit({ action: 'delete', target_table: 'admin_users', target_id: idNum, detail: `删除用户 ID:${idNum}` })

  return NextResponse.json({ success: true })
}
