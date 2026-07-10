import { NextResponse } from 'next/server'
import { query, insert, update, del } from '@/lib/db'
import { logAudit } from '@/lib/audit'

export async function GET() {
  try {
    const data = await query('SELECT * FROM mtg_agency.admin_menus ORDER BY sort_order ASC')
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const body = await request.json()
  try {
    const data = await insert('mtg_agency.admin_menus', {
      name: body.name,
      path: body.path || '',
      icon: body.icon || '',
      parent_id: body.parent_id || 0,
      sort_order: body.sort_order || 0,
    })
    await logAudit({ action: 'create', target_table: 'admin_menus', target_id: data?.id, detail: `新建菜单: ${body.name}` })
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const body = await request.json()
  try {
    const data = await update('mtg_agency.admin_menus', {
      name: body.name,
      path: body.path || '',
      icon: body.icon || '',
      parent_id: body.parent_id || 0,
      sort_order: body.sort_order || 0,
      updated_at: new Date().toISOString(),
    }, 'id = $1', [body.id])
    await logAudit({ action: 'update', target_table: 'admin_menus', target_id: body.id, detail: `更新菜单: ${body.name}` })
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少ID' }, { status: 400 })

  try {
    await del('mtg_agency.admin_menus', 'id = $1', [parseInt(id)])
    await logAudit({ action: 'delete', target_table: 'admin_menus', target_id: parseInt(id), detail: `删除菜单 ID:${id}` })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
