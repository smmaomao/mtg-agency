import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const eventType = searchParams.get('event_type')
  const eventName = searchParams.get('event_name')
  const status = searchParams.get('status')
  const mappingId = searchParams.get('mapping_id')
  const clickId = searchParams.get('click_id')

  let query = supabase
    .from('callback_logs')
    .select(`
      *,
      packages_dsp_mapping:mapping_id (dsp_name, channel_name, dsp_package_id)
    `, { count: 'exact' })

  if (eventType) query = query.eq('event_type', eventType)
  if (eventName) query = query.eq('event_name', eventName)
  if (status) query = query.eq('status', status)
  if (mappingId) query = query.eq('mapping_id', parseInt(mappingId))
  if (clickId) query = query.eq('click_id', clickId)

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, total: count, page, pageSize })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: '缺少ID' }, { status: 400 })
  }

  const { error } = await supabase
    .from('callback_logs')
    .delete()
    .eq('id', parseInt(id))

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
