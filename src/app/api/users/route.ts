import { withTiming } from '../../../lib/timing'
import { NextResponse } from 'next/server'
import { query, insert, update, del } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export const GET = withTiming(async () => {
  try {
    const data = await query('SELECT id, username, real_name, role_id, status, created_at FROM mtg_agency.admin_users ORDER BY id ASC')
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

})

export const POST = withTiming(async (request: Request) => {
  const body = await request.json()
  try {
    const data = await insert('mtg_agency.admin_users', {
      username: body.username,
      password_hash: hashPassword(body.password),
      real_name: body.real_name || '',
      role_id: body.role_id || null,
      status: body.status ?? 1,
    })
    await logAudit({ action: 'create', target_table: 'admin_users', target_id: data?.id, detail: `新建用户: ${body.username}` })
    return NextResponse.json({ data })
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '用户名已存在' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

export const PUT = withTiming(async (request: Request) => {
  const body = await request.json()
  const updateData: Record<string, any> = {
    real_name: body.real_name || '',
    role_id: body.role_id || null,
    status: body.status ?? 1,
    updated_at: new Date().toISOString(),
  }
  if (body.password) {
    updateData.password_hash = hashPassword(body.password)
  }

  try {
    const data = await update('mtg_agency.admin_users', updateData, 'id = $1', [body.id])
    await logAudit({ action: 'update', target_table: 'admin_users', target_id: body.id, detail: `更新用户 ID:${body.id}` })
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

export const DELETE = withTiming(async (request: Request) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少ID' }, { status: 400 })
  const idNum = parseInt(id)
  if (idNum === 1) return NextResponse.json({ error: '不能删除超级管理员' }, { status: 400 })

  try {
    await del('mtg_agency.admin_users', 'id = $1', [idNum])
    await logAudit({ action: 'delete', target_table: 'admin_users', target_id: idNum, detail: `删除用户 ID:${idNum}` })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

})
