import { withTiming } from '../../../lib/timing'
import { NextResponse } from 'next/server'
import { query, insert, update, del } from '@/lib/db'
import { refreshCache } from '@/lib/tokenCache'
import { logAudit } from '@/lib/audit'
import crypto from 'crypto'

function generateToken(): string {
  return crypto.randomBytes(16).toString('hex')
}

export const GET = withTiming(async () => {
  try {
    const data = await query('SELECT * FROM mtg_agency.ip_whitelist ORDER BY id ASC')
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

})

export const POST = withTiming(async (request: Request) => {
  const body = await request.json()
  if (!body.name) return NextResponse.json({ error: '请输入名称' }, { status: 400 })

  try {
    const data = await insert('mtg_agency.ip_whitelist', {
      token: generateToken(),
      name: body.name,
      remark: body.remark || '',
      status: body.status ?? 1,
    })
    await refreshCache()
    await logAudit({ action: 'create', target_table: 'ip_whitelist', target_id: data?.id, detail: `新增token: ${body.name}` })
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

export const PUT = withTiming(async (request: Request) => {
  const body = await request.json()
  if (!body.id) return NextResponse.json({ error: '缺少ID' }, { status: 400 })

  const updateData: Record<string, any> = {
    name: body.name,
    remark: body.remark || '',
    status: body.status ?? 1,
    updated_at: new Date().toISOString(),
  }
  if (body.regenerate) updateData.token = generateToken()

  try {
    const data = await update('mtg_agency.ip_whitelist', updateData, 'id = $1', [body.id])
    await refreshCache()
    await logAudit({ action: 'update', target_table: 'ip_whitelist', target_id: body.id, detail: `更新token: ${body.name}` })
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
    await del('mtg_agency.ip_whitelist', 'id = $1', [parseInt(id)])
    await refreshCache()
    await logAudit({ action: 'delete', target_table: 'ip_whitelist', target_id: parseInt(id), detail: `删除token ID:${id}` })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

})
