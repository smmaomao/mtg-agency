import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase/server'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ user: null })
  }

  // Fetch role info from database
  let role_name = ''
  let menu_permissions: number[] = []
  if (session.role_id) {
    try {
      const { data } = await supabase
        .from('admin_roles')
        .select('name, menu_permissions')
        .eq('id', session.role_id)
        .single()
      if (data) {
        role_name = data.name || ''
        menu_permissions = data.menu_permissions || []
      }
    } catch {
      // ignore
    }
  }

  return NextResponse.json({ user: { ...session, role_name, menu_permissions } })
}
