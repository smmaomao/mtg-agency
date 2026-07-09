'use client'

import { useState, useEffect } from 'react'
import { getCached } from '@/lib/apiCache'
import RefreshButton from '@/components/RefreshButton'
import Pagination from '@/components/Pagination'

interface ReportLog {
  id: number
  mapping_id: number | null
  report_type: string
  report_date: string | null
  pull_params: string | null
  file_count: number
  total_rows: number
  status: string
  error_message: string | null
  started_at: string | null
  finished_at: string | null
  created_at: string
  packages_dsp_mapping: { dsp_name: string; channel_name: string | null } | null
}

export default function ReportLogsPage() {
  const [logs, setLogs] = useState<ReportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ report_type: '', status: '' });
  const [detail, setDetail] = useState<ReportLog | null>(null);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => { load(); }, [page, pageSize, filters]);

  function buildUrl() {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (filters.report_type) params.set('report_type', filters.report_type);
    if (filters.status) params.set('status', filters.status);
    return `/api/report-logs?${params}`;
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
    await fetch(`/api/report-logs?id=${id}`, { method: 'DELETE' })
    load()
  }

  function formatJson(s: string | null) {
    if (!s) return '-'
    try { return JSON.stringify(JSON.parse(s), null, 2) }
    catch { return s }
  }

  function formatDuration(started: string | null, finished: string | null) {
    if (!started) return '-'
    const start = new Date(started).getTime()
    const end = finished ? new Date(finished).getTime() : Date.now()
    const ms = end - start
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between border-b border-gray-200 pb-4">
        <h1 className="font-heading text-base font-semibold text-black tracking-tight">报表拉取日志</h1>
        <RefreshButton onRefresh={load} />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select value={filters.report_type} onChange={e => { setFilters({ ...filters, report_type: e.target.value }); setPage(1) }}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13px] text-gray-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30">
          <option value="">全部报表类型</option>
          <option value="daily">日报表</option>
          <option value="hourly">小时报表</option>
          <option value="campaign">广告计划</option>
          <option value="creative">创意报表</option>
          <option value="other">其他</option>
        </select>
        <select value={filters.status} onChange={e => { setFilters({ ...filters, status: e.target.value }); setPage(1) }}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13px] text-gray-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30">
          <option value="">全部状态</option>
          <option value="success">成功</option>
          <option value="failed">失败</option>
          <option value="running">运行中</option>
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
            <table className="w-full text-left min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-200 text-[15px] tracking-[0.1em] text-gray-400">
                  <th className="py-2.5 pl-4 font-medium text-[13px] text-black">ID</th>
                  <th className="py-2.5 font-medium text-[13px] text-black">DSP 平台</th>
                  <th className="py-2.5 font-medium text-[13px] text-black">报表类型</th>
                  <th className="py-2.5 font-medium text-[13px] text-black">报表日期</th>
                  <th className="py-2.5 font-medium text-[13px] text-black">文件数</th>
                  <th className="py-2.5 font-medium text-[13px] text-black">总行数</th>
                  <th className="py-2.5 font-medium text-[13px] text-black">状态</th>
                  <th className="py-2.5 font-medium text-[13px] text-black">耗时</th>
                  <th className="py-2.5 pr-4 font-medium text-right text-[13px] text-black">操作</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={9} className="py-16 text-center text-[15px] text-gray-400">暂无可查看的数据</td></tr>
                ) : logs.map(l => (
                  <tr key={l.id} className="border-b border-gray-200/50 text-[15px] text-gray-700 hover:bg-gray-100 transition-colors">
                    <td className="py-2.5 pl-4 font-mono text-gray-400">{l.id}</td>
                    <td className="py-2.5">{l.packages_dsp_mapping?.dsp_name || '-'}</td>
                    <td className="py-2.5">
                      <span className="inline-flex items-center rounded-sm bg-blue-500/10 px-1.5 py-0.5 font-mono text-[15px] text-blue-400">{l.report_type}</span>
                    </td>
                    <td className="py-2.5 font-mono text-gray-500">{l.report_date || '-'}</td>
                    <td className="py-2.5 font-mono text-gray-500">{l.file_count}</td>
                    <td className="py-2.5 font-mono text-gray-500">{l.total_rows.toLocaleString()}</td>
                    <td className="py-2.5">
                      <span className={`h-1.5 w-1.5 rounded-full inline-block mr-1.5 ${
                        l.status === 'success' ? 'bg-green-500' : l.status === 'running' ? 'bg-amber-500' : 'bg-red-500'
                      }`} />
                      {l.status === 'success' ? '成功' : l.status === 'running' ? '运行中' : '失败'}
                    </td>
                    <td className="py-2.5 font-mono text-[15px] text-gray-400">{formatDuration(l.started_at, l.finished_at)}</td>
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
          <div className="w-full max-w-[700px] border border-gray-200 bg-white shadow-2xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
              <span className="text-[10px] font-medium tracking-[0.15em] text-gray-700 uppercase">日志详情 #{detail.id}</span>
              <button onClick={() => setDetail(null)} className="text-zinc-500 hover:text-gray-700">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                <DetailField label="DSP 平台" value={detail.packages_dsp_mapping?.dsp_name || '-'} />
                <DetailField label="报表类型" value={detail.report_type} />
                <DetailField label="报表日期" value={detail.report_date || '-'} />
                <DetailField label="状态" value={detail.status === 'success' ? '成功' : detail.status === 'running' ? '运行中' : '失败'} />
                <DetailField label="文件数" value={String(detail.file_count)} />
                <DetailField label="总行数" value={detail.total_rows.toLocaleString()} />
                <DetailField label="开始时间" value={detail.started_at ? new Date(detail.started_at).toLocaleString('zh-CN') : '-'} />
                <DetailField label="结束时间" value={detail.finished_at ? new Date(detail.finished_at).toLocaleString('zh-CN') : '-'} />
                <DetailField label="耗时" value={formatDuration(detail.started_at, detail.finished_at)} />
                <DetailField label="创建时间" value={new Date(detail.created_at).toLocaleString('zh-CN')} />
              </div>
              {detail.error_message && (
                <div>
                  <label className="mb-1.5 block text-[9px] font-medium tracking-[0.15em] text-red-600 uppercase">错误信息</label>
                  <pre className="whitespace-pre-wrap break-all border border-red-500/20 bg-red-950/20 px-3 py-2 text-[11px] text-red-600 font-mono max-h-[150px] overflow-auto">{detail.error_message}</pre>
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-[9px] font-medium tracking-[0.15em] text-gray-400 uppercase">拉取参数</label>
                <pre className="whitespace-pre-wrap break-all border border-gray-200 bg-white px-3 py-2 text-[11px] text-gray-500 font-mono max-h-[200px] overflow-auto">{formatJson(detail.pull_params)}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-400 min-w-[64px]">{label}</span>
      <span className="text-zinc-200">{value}</span>
    </div>
  )
}
