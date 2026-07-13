'use client'

import { useState, useEffect } from 'react'
import { getCached } from '@/lib/apiCache'
import RefreshButton from '@/components/RefreshButton'
import Pagination from '@/components/Pagination'

interface CallbackLog {
  id: number
  mapping_id: number | null
  event_type: string
  event_name: string | null
  click_id: string | null
  request_url: string | null
  request_body: string | null
  response_body: string | null
  callback_data: string | null
  response_code: number | null
  response_time: number | null
  http_status: number | null
  status: string
  pixel_id: string | null
  package_name: string | null
  standard_event_code: string | null
  ip_address: string | null
  created_at: string
  dsp_name: string | null
}

const eventColors: Record<string, string> = {
  install: 'bg-blue-500/10 text-blue-600',
  register: 'bg-green-500/10 text-green-600',
  login: 'bg-purple-500/10 text-purple-600',
  create_role: 'bg-teal-500/10 text-teal-600',
  purchase: 'bg-rose-500/10 text-rose-600',
  retention_1d: 'bg-orange-500/10 text-orange-600',
  retention_7d: 'bg-yellow-500/10 text-yellow-600',
  event: 'bg-slate-500/10 text-slate-600',
}

function getEventColor(key: string) {
  return eventColors[key] || 'bg-amber-500/10 text-amber-400'
}

export default function CallbackLogsPage() {
  const [logs, setLogs] = useState<CallbackLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ event_name: '', status: '', click_id: '' });
  const [detail, setDetail] = useState<CallbackLog | null>(null);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => { load(); }, [page, pageSize, filters]);

  function buildUrl() {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (filters.event_name) params.set('event_name', filters.event_name);
    if (filters.status) params.set('status', filters.status);
    if (filters.click_id) params.set('click_id', filters.click_id);
    return `/api/callback-logs?${params}`;
  }

  async function load() {
    const url = buildUrl();
    if (!getCached(url)) setLoading(true);
    const res = await fetch(url);
    const { data, total: t } = await res.json();
    setLogs(data || []);
    setTotal(t || 0);
    setLoading(false);
  }

  async function handleDelete(id: number) {
    if (!confirm('确定删除此日志？')) return
    await fetch(`/api/callback-logs?id=${id}`, { method: 'DELETE' })
    load()
  }

  function formatJson(s: string | null) {
    if (!s) return '-'
    try { return JSON.stringify(JSON.parse(s), null, 2) }
    catch { return s }
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between border-b border-gray-200 pb-4">
        <h1 className="font-heading text-base font-semibold text-black tracking-tight">事件回传日志</h1>
        <RefreshButton onRefresh={load} />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input value={filters.event_name} onChange={e => { setFilters(f => ({ ...f, event_name: e.target.value })); setPage(1) }}
          placeholder="事件名称" className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13px] text-gray-700 placeholder-gray-400 outline-none w-[160px] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30" />
        <input value={filters.click_id} onChange={e => { setFilters(f => ({ ...f, click_id: e.target.value })); setPage(1) }}
          placeholder="点击 ID" className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13px] text-gray-700 placeholder-gray-400 outline-none w-[200px] font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30" />
        <select value={filters.status} onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1) }}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13px] text-gray-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30">
          <option value="">全部状态</option>
          <option value="success">成功</option>
          <option value="failed">失败</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="h-4 w-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : (
        <>
          <div className="border border-gray-200 bg-white overflow-auto">
            <table className="w-full text-left min-w-[1000px]">
              <thead>
                <tr className="border-b border-gray-200 text-[15px] tracking-[0.1em] text-gray-400">
                  <th className="py-2.5 pl-4 font-medium text-[13px] text-black">ID</th>
                  <th className="py-2.5 font-medium text-[13px] text-black">事件名称</th>
                  <th className="py-2.5 font-medium text-[13px] text-black">Click ID</th>
                  <th className="py-2.5 font-medium text-[13px] text-black">campuuid</th>
                  <th className="py-2.5 font-medium text-[13px] text-black">响应码</th>
                  <th className="py-2.5 font-medium text-[13px] text-black">耗时</th>
                  <th className="py-2.5 font-medium text-[13px] text-black">结果</th>
                  <th className="py-2.5 font-medium text-[13px] text-black">时间</th>
                  <th className="py-2.5 pr-4 font-medium text-right text-[13px] text-black">操作</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={9} className="py-16 text-center text-[15px] text-gray-400">暂无可查看的数据</td></tr>
                ) : logs.map(l => (
                  <tr key={l.id} className="border-b border-gray-200/50 text-[15px] text-gray-700 hover:bg-gray-100 transition-colors">
                    <td className="py-2.5 pl-4 font-mono text-gray-400">{l.id}</td>
                    <td className="py-2.5">
                      <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 font-mono text-[15px] ${getEventColor(l.event_name || l.event_type)}`}>{l.event_name || l.event_type}</span>
                    </td>
                    <td className="py-2.5 font-mono text-[15px] text-gray-500 max-w-[180px] truncate" title={l.click_id || ''}>{l.click_id || '-'}</td>
                    <td className="py-2.5 font-mono text-[15px] text-gray-500 max-w-[160px] truncate" title={l.pixel_id || ''}>{l.pixel_id || '-'}</td>
                    <td className="py-2.5 font-mono text-gray-500">{l.response_code || l.http_status || '-'}</td>
                    <td className="py-2.5 font-mono text-gray-500">{l.response_time != null ? `${l.response_time}ms` : '-'}</td>
                    <td className="py-2.5">
                      <span className={`h-1.5 w-1.5 rounded-full inline-block mr-1.5 ${l.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                      {l.status === 'success' ? '成功' : '失败'}
                    </td>
                    <td className="py-2.5 text-gray-400 text-[15px]">{new Date(l.created_at).toLocaleString('zh-CN')}</td>
                    <td className="py-2.5 pr-4 text-right space-x-2">
                      <button onClick={() => setDetail(l)} className="text-zinc-500 hover:text-gray-800">详情</button>
                      <button onClick={() => handleDelete(l.id)} className="text-zinc-600 hover:text-red-400">删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={s => { setPageSize(s); setPage(1) }}
          />
        </>
      )}

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500/20 backdrop-blur-sm" onClick={() => setDetail(null)}>
          <div className="w-full max-w-[750px] border border-gray-200 bg-white shadow-2xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
              <span className="text-[10px] font-medium tracking-[0.15em] text-gray-700 uppercase">日志详情 #{detail.id}</span>
              <button onClick={() => setDetail(null)} className="text-zinc-500 hover:text-gray-700">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                <DetailField label="事件名称" value={detail.event_name || '-'} />
                <DetailField label="事件类型" value={detail.event_type} />
                <DetailField label="标准事件码" value={detail.standard_event_code || '-'} />
                <DetailField label="Click ID" value={detail.click_id || '-'} mono />
                <DetailField label="Pixel ID" value={detail.pixel_id || '-'} />
                <DetailField label="DSP 平台" value={detail.dsp_name || '-'} />
                <DetailField label="包名" value={detail.package_name || '-'} mono />
                <DetailField label="响应码" value={String(detail.response_code || detail.http_status || '-')} />
                <DetailField label="响应耗时" value={detail.response_time != null ? `${detail.response_time}ms` : '-'} />
                <DetailField label="结果" value={detail.status === 'success' ? '成功' : '失败'} />
                <DetailField label="IP 地址" value={detail.ip_address || '-'} />
                <DetailField label="时间" value={new Date(detail.created_at).toLocaleString('zh-CN')} />
              </div>
              <div>
                <label className="mb-1.5 block text-[9px] font-medium tracking-[0.15em] text-gray-400 uppercase">请求 URL</label>
                <pre className="whitespace-pre-wrap break-all border border-gray-200 bg-white px-3 py-2 text-[11px] text-gray-500 font-mono max-h-[120px] overflow-auto">{detail.request_url || '-'}</pre>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-[9px] font-medium tracking-[0.15em] text-gray-400 uppercase">请求体</label>
                  <pre className="whitespace-pre-wrap break-all border border-gray-200 bg-white px-3 py-2 text-[11px] text-gray-500 font-mono max-h-[200px] overflow-auto">{formatJson(detail.request_body)}</pre>
                </div>
                <div>
                  <label className="mb-1.5 block text-[9px] font-medium tracking-[0.15em] text-gray-400 uppercase">响应体</label>
                  <pre className="whitespace-pre-wrap break-all border border-gray-200 bg-white px-3 py-2 text-[11px] text-gray-500 font-mono max-h-[200px] overflow-auto">{formatJson(detail.response_body)}</pre>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[9px] font-medium tracking-[0.15em] text-gray-400 uppercase">回调数据</label>
                <pre className="whitespace-pre-wrap break-all border border-gray-200 bg-white px-3 py-2 text-[11px] text-gray-500 font-mono max-h-[180px] overflow-auto">{formatJson(detail.callback_data)}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-400 min-w-[64px]">{label}</span>
      <span className={`${mono ? 'font-mono text-[11px]' : ''} text-gray-800`}>{value}</span>
    </div>
  )
}
