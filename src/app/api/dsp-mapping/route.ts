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
    .from('packages_dsp_mapping')
    .select(`
      *,
      app_packages:package_id (name, package_name, platform)
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
    .from('packages_dsp_mapping')
    .insert({
      package_id: body.package_id,
      dsp_name: body.dsp_name,
      channel_name: body.channel_name || null,
      dsp_package_id: body.dsp_package_id || null,
      status: body.status || 'active',
      remark: body.remark || null,
    })
    .select(`
      *,
      app_packages:package_id (name, package_name, platform)
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logAudit({ action: 'create', target_table: 'packages_dsp_mapping', target_id: data.id, detail: `新建映射: ${body.dsp_name}` })

  return NextResponse.json({ data })
}

export async function PUT(request: Request) {
  const body = await request.json()

  const { data, error } = await supabase
    .from('packages_dsp_mapping')
    .update({
      package_id: body.package_id,
      dsp_name: body.dsp_name,
      channel_name: body.channel_name || null,
      dsp_package_id: body.dsp_package_id || null,
      status: body.status || 'active',
      remark: body.remark || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', body.id)
    .select(`
      *,
      app_packages:package_id (name, package_name, platform)
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logAudit({ action: 'update', target_table: 'packages_dsp_mapping', target_id: body.id, detail: `更新映射: ${body.dsp_name}` })

  return NextResponse.json({ data })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: '缺少ID' }, { status: 400 })
  }

  const { error } = await supabase
    .from('packages_dsp_mapping')
    .delete()
    .eq('id', parseInt(id))

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logAudit({ action: 'delete', target_table: 'packages_dsp_mapping', target_id: parseInt(id), detail: `删除映射 ID:${id}` })

  return NextResponse.json({ success: true })
}
