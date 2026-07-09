import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const action = searchParams.get('action')
  const targetTable = searchParams.get('target_table')
  const username = searchParams.get('username')

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })

  if (action) query = query.eq('action', action)
  if (targetTable) query = query.eq('target_table', targetTable)
  if (username) query = query.ilike('username', `%${username}%`)

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, total: count, page, pageSize })
}
