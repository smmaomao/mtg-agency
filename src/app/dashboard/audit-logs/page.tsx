'use client'

import { useState, useEffect } from 'react'
import Pagination from '@/components/Pagination'
import RefreshButton from '@/components/RefreshButton'

interface AuditLog {
  id: number
  user_id: number | null
  username: string
  action: string
  target_table: string
  target_id: number | null
  detail: string | null
  created_at: string
}

const actionMap: Record<string, { label: string; color: string }> = {
  create: { label: '新增', color: 'text-green-600 bg-green-50' },
  update: { label: '修改', color: 'text-blue-600 bg-blue-50' },
  delete: { label: '删除', color: 'text-red-600 bg-red-50' },
}

const tableMap: Record<string, string> = {
  admin_users: '用户',
  admin_roles: '角色',
  admin_menus: '菜单',
  customers: '客户',
  products: '产品',
  app_packages: '包体',
  packages_dsp_mapping: '映射',
  ip_whitelist: '回传token', // 兼容历史审计记录（旧表名）
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [filters, setFilters] = useState({ action: '', target_table: '', username: '' })

  useEffect(() => { load() }, [page, pageSize, filters])

  async function load() {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (filters.action) params.set('action', filters.action)
    if (filters.target_table) params.set('target_table', filters.target_table)
    if (filters.username) params.set('username', filters.username)

    const res = await fetch(`/api/audit-logs?${params}`)
    const { data, total: t } = await res.json()
    setLogs(data || [])
    setTotal(t || 0)
    setLoading(false)
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between border-b border-gray-200 pb-4">
        <h1 className="text-xl font-semibold text-black tracking-tight">操作日志</h1>
        <RefreshButton onRefresh={load} />
      </div>

      {/* 筛选 */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select value={filters.action} onChange={e => { setFilters(f => ({ ...f, action: e.target.value })); setPage(1) }}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13px] text-gray-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30">
          <option value="">全部操作</option>
          <option value="create">新增</option>
          <option value="update">修改</option>
          <option value="delete">删除</option>
        </select>
        <select value={filters.target_table} onChange={e => { setFilters(f => ({ ...f, target_table: e.target.value })); setPage(1) }}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13px] text-gray-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30">
          <option value="">全部模块</option>
          <option value="admin_users">用户</option>
          <option value="admin_roles">角色</option>
          <option value="admin_menus">菜单</option>
          <option value="customers">客户</option>
          <option value="products">产品</option>
          <option value="app_packages">包体</option>
          <option value="packages_dsp_mapping">映射</option>
        </select>
        <input value={filters.username} onChange={e => { setFilters(f => ({ ...f, username: e.target.value })); setPage(1) }}
          placeholder="操作人" className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13px] text-gray-700 placeholder-gray-400 outline-none w-[140px] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="text-sm text-gray-400">加载中...</span>
        </div>
      ) : (
        <>
        <div className="border border-gray-200 bg-white">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-2.5 text-[13px] font-medium text-black">时间</th>
                <th className="px-4 py-2.5 text-[13px] font-medium text-black">操作人</th>
                <th className="px-4 py-2.5 text-[13px] font-medium text-black">操作</th>
                <th className="px-4 py-2.5 text-[13px] font-medium text-black">模块</th>
                <th className="px-4 py-2.5 text-[13px] font-medium text-black">详情</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={5} className="py-16 text-center text-sm text-gray-400">暂无数据</td></tr>
              ) : logs.map(log => {
                const actionInfo = actionMap[log.action] || { label: log.action, color: 'text-gray-600 bg-gray-50' }
                return (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-4 py-2.5 text-sm font-medium text-gray-800">{log.username}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${actionInfo.color}`}>
                        {actionInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-600">{tableMap[log.target_table] || log.target_table}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-500">{log.detail || '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1) }} />
        </>
      )}
    </div>
  )
}
