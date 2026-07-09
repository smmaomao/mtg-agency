import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import crypto from 'crypto'

// 生成随机 token
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// GET - 列表
export async function GET() {
  const { data, error } = await supabase
    .from('ip_whitelist')
    .select('*')
    .order('id', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST - 新增（自动生成 token）
export async function POST(request: Request) {
  const body = await request.json()

  if (!body.name) {
    return NextResponse.json({ error: '请输入名称' }, { status: 400 })
  }

  const token = generateToken()

  const { data, error } = await supabase
    .from('ip_whitelist')
    .insert({
      token,
      name: body.name,
      remark: body.remark || '',
      status: body.status ?? 1,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// PUT - 更新
export async function PUT(request: Request) {
  const body = await request.json()
  if (!body.id) return NextResponse.json({ error: '缺少ID' }, { status: 400 })

  const updateData: Record<string, unknown> = {
    name: body.name,
    remark: body.remark || '',
    status: body.status ?? 1,
    updated_at: new Date().toISOString(),
  }

  // 如果传了 regenerate=true，重新生成 token
  if (body.regenerate) {
    updateData.token = generateToken()
  }

  const { data, error } = await supabase
    .from('ip_whitelist')
    .update(updateData)
    .eq('id', body.id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// DELETE - 删除
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少ID' }, { status: 400 })

  const { error } = await supabase
    .from('ip_whitelist')
    .delete()
    .eq('id', parseInt(id))

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
