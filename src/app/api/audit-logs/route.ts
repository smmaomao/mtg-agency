import { withTiming } from '../../../lib/timing'
import { NextResponse } from 'next/server'
import { query, count } from '@/lib/db'

export const GET = withTiming(async (request: Request) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const action = searchParams.get('action')
  const targetTable = searchParams.get('target_table')
  const username = searchParams.get('username')
  const from = (page - 1) * pageSize

  let where = '1=1'
  const params: any[] = []
  let paramIdx = 1

  if (action) { where += ` AND action = $${paramIdx++}`; params.push(action) }
  if (targetTable) { where += ` AND target_table = $${paramIdx++}`; params.push(targetTable) }
  if (username) { where += ` AND username ILIKE $${paramIdx++}`; params.push(`%${username}%`) }

  try {
    const data = await query(
      `SELECT * FROM mtg_agency.audit_logs WHERE ${where} ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, pageSize, from]
    )
    const total = await count('mtg_agency.audit_logs', where, params)
    return NextResponse.json({ data, total, page, pageSize })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

})
