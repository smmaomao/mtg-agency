'use client'

import { useState, useEffect } from 'react'
import { getCached } from '@/lib/apiCache'
import RefreshButton from '@/components/RefreshButton'
import Pagination from '@/components/Pagination'
import { Modal } from '@/components/Modal'
import { Field } from '@/components/Field'
import { StatusSelect } from '@/components/StatusSelect'

interface AppPackage { id: number; name: string; package_name: string | null }
interface DspMapping {
  id: number
  package_id: number
  dsp_name: string
  channel_name: string | null
  dsp_package_id: string | null
  status: string
  remark: string | null
  created_at: string
  app_packages: { name: string; package_name: string | null; platform: string | null } | null
}

const defaultForm = {
  package_id: '', dsp_name: '', channel_name: '',
  dsp_package_id: '', status: 'active', remark: '',
}
const dspOptions = ['广点通', '穿山甲', '巨量引擎', '快手', '百度', 'Vungle', 'Unity Ads', 'AdMob', '其他']
const statusOptions = ['active', 'inactive']

export default function DspMappingPage() {
  const [mappings, setMappings] = useState<DspMapping[]>([])
  const [packages, setPackages] = useState<AppPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<DspMapping | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [message, setMessage] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(20)

  useEffect(() => { load() }, [page])

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/dsp-mapping?page=${page}&pageSize=${pageSize}`)
    const { data, total: t } = await res.json()
    setMappings(data || [])
    setTotal(t || 0)
    setLoading(false)
  }

  async function loadPackages() {
    const res = await fetch('/api/packages?pageSize=1000')
    const { data } = await res.json()
    setPackages(data || [])
  }

  function openCreate() { setEditing(null); setForm(defaultForm); setMessage(''); loadPackages(); setShowModal(true) }
  function openEdit(m: DspMapping) {
    setEditing(m)
    setForm({
      package_id: String(m.package_id), dsp_name: m.dsp_name,
      channel_name: m.channel_name || '', dsp_package_id: m.dsp_package_id || '',
      status: m.status, remark: m.remark || '',
    })
     setMessage(''); loadPackages(); setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const body = {
      package_id: parseInt(form.package_id),
      dsp_name: form.dsp_name,
      channel_name: form.channel_name || null,
      dsp_package_id: form.dsp_package_id || null,
      status: form.status,
      remark: form.remark || null,
    }
    const method = editing ? 'PUT' : 'POST'
    const payload = editing ? { ...body, id: editing.id } : body
    const res = await fetch('/api/dsp-mapping', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const result = await res.json()
    if (result.error) { setMessage(result.error); return }
    setShowModal(false); load()
  }

  async function handleDelete(id: number) {
    if (!confirm('确定删除此映射？')) return
    const res = await fetch(`/api/dsp-mapping?id=${id}`, { method: 'DELETE' })
    const result = await res.json()
    if (result.error) { setMessage(result.error); return }
    load()
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between border-b border-gray-200 pb-4">
        <div>

          <h1 className="font-heading text-base font-semibold text-black tracking-tight">包映射配置</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openCreate} className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition-all hover:bg-emerald-100 hover:text-emerald-800">
            + 新增映射
          </button>
          <RefreshButton onRefresh={load} />
        </div>
      </div>

      {message && (
        <div className="mb-4 flex items-center gap-2 rounded-sm border border-red-500/20 bg-red-50 px-3 py-2">
          <span className="text-xs text-red-600">{message}</span>
        </div>
      )}

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
                <th className="py-2.5 font-medium text-[13px] text-black">包体</th>
                <th className="py-2.5 font-medium text-[13px] text-black">DSP 平台</th>
                <th className="py-2.5 font-medium text-[13px] text-black">渠道</th>
                <th className="py-2.5 font-medium text-[13px] text-black">DSP 包 ID</th>
                <th className="py-2.5 font-medium text-[13px] text-black">状态</th>
                <th className="py-2.5 pr-4 font-medium text-right text-[13px] text-black">操作</th>
              </tr>
            </thead>
            <tbody>
              {mappings.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-[15px] text-gray-400">暂无数据</td></tr>
              ) : mappings.map(m => (
                <tr key={m.id} className="border-b border-gray-200/50 text-[15px] text-gray-700 hover:bg-gray-100 transition-colors">
                  <td className="py-2.5 pl-4 font-mono text-gray-400">{m.id}</td>
                  <td className="py-2.5">{m.app_packages?.name || '-'}</td>
                  <td className="py-2.5 font-medium text-gray-800">{m.dsp_name}</td>
                  <td className="py-2.5">{m.channel_name || '-'}</td>
                  <td className="py-2.5 font-mono text-gray-400 text-[15px]">{m.dsp_package_id || '-'}</td>
                  <td className="py-2.5">
                    <span className={`inline-flex items-center gap-1 ${m.status === 'active' ? 'text-green-500' : 'text-zinc-500'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${m.status === 'active' ? 'bg-green-500' : 'bg-zinc-600'}`} />
                      {m.status === 'active' ? '启用' : '停用'}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-right">
                    <button onClick={() => openEdit(m)} className="text-zinc-500 hover:text-gray-800 mr-2">编辑</button>
                    <button onClick={() => handleDelete(m.id)} className="text-zinc-600 hover:text-red-400">删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1) }} />
        </>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? '编辑映射' : '新增映射'} maxWidth={520}>
            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              {message && (
                <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2">
                  <span className="text-xs text-red-600">{message}</span>
                </div>
              )}
              <Field label="包体">
                <select value={form.package_id} onChange={e => setForm({ ...form, package_id: e.target.value })} className="focus-ring w-full rounded-full border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-800 outline-none" required>
                  <option value="">请选择包体</option>
                  {packages.map(p => <option key={p.id} value={p.id}>{p.name}{p.package_name ? ` (${p.package_name})` : ''}</option>)}
                </select>
              </Field>
              <Field label="DSP 平台" value={form.dsp_name} onChange={e => {
                const val = e.target.value
                if (dspOptions.includes(val)) {
                  setForm({ ...form, dsp_name: val })
                }
              }} placeholder="输入或选择 DSP 平台" required list="dsp-list" />
              <datalist id="dsp-list">
                {dspOptions.map(d => <option key={d} value={d} />)}
              </datalist>
              <div className="grid grid-cols-2 gap-4">
                <Field label="渠道名称" value={form.channel_name} onChange={e => setForm({ ...form, channel_name: e.target.value })} placeholder="如 信息流-Android" />
                <Field label="DSP 包 ID" value={form.dsp_package_id} onChange={e => setForm({ ...form, dsp_package_id: e.target.value })} placeholder="DSP 平台广告计划 ID" />
              </div>
              <Field label="状态">
                <StatusSelect
                  value={form.status}
                  onChange={raw => setForm({ ...form, status: raw })}
                  options={[{ value: 'active', label: '启用' }, { value: 'inactive', label: '停用' }]}
                />
              </Field>
              <Field label="备注">
                <textarea value={form.remark} onChange={e => setForm({ ...form, remark: e.target.value })} rows={2} className="focus-ring w-full rounded-full border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-800 placeholder-gray-400 outline-none transition-colors hover:border-gray-300" />
              </Field>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="focus-ring flex-1 rounded-full border border-gray-200 bg-transparent py-2 text-[10px] font-medium tracking-wide text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-800">取消</button>
                <button type="submit" className="focus-ring flex-1 rounded-full border border-amber-500/30 bg-amber-500/10 py-2 text-[10px] font-medium tracking-wide text-amber-500 transition-all hover:border-amber-500/50 hover:bg-amber-500/15">{editing ? '保存' : '创建'}</button>
              </div>
            </form>
      </Modal>
    </div>
  )
}


