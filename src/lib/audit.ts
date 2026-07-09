import { supabase } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'

interface AuditLogParams {
  action: 'create' | 'update' | 'delete'
  target_table: string
  target_id?: number
  detail?: string
}

// 不需要审计的表
const SKIP_TABLES = new Set(['audit_logs', 'callback_logs', 'report_pull_logs'])

/**
 * 记录审计日志
 */
export async function logAudit(params: AuditLogParams) {
  if (SKIP_TABLES.has(params.target_table)) return

  let username = 'system'
  let userId: number | null = null

  try {
    const session = await getSession()
    if (session) {
      username = session.username || 'system'
      userId = session.id || null
    }
  } catch {
    // session 获取失败，使用默认值
  }

  const { error } = await supabase.from('audit_logs').insert({
    user_id: userId,
    username,
    action: params.action,
    target_table: params.target_table,
    target_id: params.target_id || null,
    detail: params.detail || null,
  })

  if (error) {
    console.error('[audit] Insert error:', error.message)
  }
}
