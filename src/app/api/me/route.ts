import { withTiming } from '../../../lib/timing'
import { NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const GET = withTiming(async () => {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ user: null })
  }

  let role_name = ''
  let menu_permissions: number[] = []
  if (session.role_id) {
    const role = await queryOne<{ name: string; menu_permissions: number[] }>(
      'SELECT name, menu_permissions FROM mtg_agency.admin_roles WHERE id = $1',
      [session.role_id]
    )
    if (role) {
      role_name = role.name || ''
      menu_permissions = role.menu_permissions || []
    }
  }

  return NextResponse.json({ user: { ...session, role_name, menu_permissions } })
})
