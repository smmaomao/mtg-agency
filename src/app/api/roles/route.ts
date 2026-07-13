import { withTiming } from '../../../lib/timing'
import { NextResponse } from 'next/server'
import { query, insert, update, del } from '@/lib/db'
import { logAudit } from '@/lib/audit'

export const GET = withTiming(async () => {
  try {
    const data = await query('SELECT * FROM mtg_agency.admin_roles ORDER BY id ASC')
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

})

export const POST = withTiming(async (request: Request) => {
  const body = await request.json()
  try {
    const data = await insert('mtg_agency.admin_roles', {
      name: body.name,
      description: body.description || '',
      menu_permissions: body.menu_permissions || [],
      status: body.status ?? 1,
    })
    await logAudit({ action: 'create', target_table: 'admin_roles', target_id: data?.id, detail: `新建角色: ${body.name}` })
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

export const PUT = withTiming(async (request: Request) => {
  const body = await request.json()
  try {
    const data = await update('mtg_agency.admin_roles', {
      name: body.name,
      description: body.description || '',
      menu_permissions: body.menu_permissions || [],
      status: body.status ?? 1,
      updated_at: new Date().toISOString(),
    }, 'id = $1', [body.id])
    await logAudit({ action: 'update', target_table: 'admin_roles', target_id: body.id, detail: `更新角色: ${body.name}` })
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
  if (idNum === 1) return NextResponse.json({ error: '不能删除超级管理员角色' }, { status: 400 })

  try {
    await del('mtg_agency.admin_roles', 'id = $1', [idNum])
    await logAudit({ action: 'delete', target_table: 'admin_roles', target_id: idNum, detail: `删除角色 ID:${idNum}` })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

})
