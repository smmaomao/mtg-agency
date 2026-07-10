import { insert } from '@/lib/db'

interface AuditLogParams {
  action: 'create' | 'update' | 'delete'
  target_table: string
  target_id?: number
  detail?: string
}

// 不需要审计的表
const SKIP_TABLES = new Set(['audit_logs', 'callback_logs', 'report_pull_logs'])

/**
 * 记录审计日志（直连数据库，最快）
 */
export async function logAudit(params: AuditLogParams) {
  if (SKIP_TABLES.has(params.target_table)) return

  try {
    await insert('mtg_agency.audit_logs', {
      user_id: null,
      username: 'admin',
      action: params.action,
      target_table: params.target_table,
      target_id: params.target_id || null,
      detail: params.detail || null,
    })
  } catch (err) {
    console.error('[audit] Failed:', err)
  }
}
