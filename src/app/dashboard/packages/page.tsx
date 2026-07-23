'use client'

import { useState, useEffect } from 'react'
import RefreshButton from '@/components/RefreshButton'
import Pagination from '@/components/Pagination'
import { Modal } from '@/components/Modal'
import { Field } from '@/components/Field'

interface Product { id: number; name: string }
interface AppPackage {
  id: number
  product_id: number
  name: string
  platform: string | null
  version: string | null
  download_url: string | null
  icon_url: string | null
  remark: string | null
  package_name: string | null
  landing_page_url: string | null
  created_at: string
  product_name: string | null
}

const defaultForm = {
  product_id: '', name: '', platform: 'android', version: '',
  download_url: '', icon_url: '', package_name: '', landing_page_url: '', remark: '',
}
const platforms = ['android', 'ios', 'windows', 'web', 'pwa', 'other']

function platformBadge(p: string | null) {
  const map: Record<string, string> = {
    android: 'bg-green-500/10 text-green-600',
    ios: 'bg-blue-500/10 text-blue-600',
    windows: 'bg-sky-500/10 text-sky-600',
    web: 'bg-purple-500/10 text-purple-600',
    pwa: 'bg-fuchsia-500/10 text-fuchsia-600',
    other: 'bg-gray-500/10 text-gray-600',
  }
  const cls = p ? map[p] || 'bg-gray-500/10 text-gray-600' : 'text-gray-300'
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-medium ${cls}`}>{p || '未设置'}</span>
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<AppPackage[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<AppPackage | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [message, setMessage] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(20)

  useEffect(() => { load() }, [page])

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/packages?page=${page}&pageSize=${pageSize}`)
    const { data, total: t } = await res.json()
    setPackages(data || [])
    setTotal(t || 0)
    setLoading(false)
  }

  async function loadProducts() {
    const res = await fetch('/api/products?pageSize=1000')
    const { data } = await res.json()
    setProducts(data || [])
  }

  function openCreate() { setEditing(null); setForm(defaultForm); setMessage(''); loadProducts(); setShowModal(true) }
  function openEdit(p: AppPackage) {
    setEditing(p)
    setForm({
      product_id: String(p.product_id), name: p.name,
      platform: p.platform || 'android', version: p.version || '',
      download_url: p.download_url || '', icon_url: p.icon_url || '',
      package_name: p.package_name || '', landing_page_url: p.landing_page_url || '',
      remark: p.remark || '',
    })
     setMessage(''); loadProducts(); setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const body = {
      product_id: parseInt(form.product_id),
      name: form.name,
      platform: form.platform,
      version: form.version || null,
      download_url: form.download_url || null,
      package_name: form.package_name || null,
      landing_page_url: form.landing_page_url || null,
      remark: form.remark || null,
    }
    const method = editing ? 'PUT' : 'POST'
    const payload = editing ? { ...body, id: editing.id } : body
    const res = await fetch('/api/packages', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const result = await res.json()
    if (result.error) { setMessage(result.error); return }
    setShowModal(false); load()
  }

  async function handleDelete(id: number) {
    if (!confirm('确定删除此包体？')) return
    const res = await fetch(`/api/packages?id=${id}`, { method: 'DELETE' })
    const result = await res.json()
    if (result.error) { setMessage(result.error); return }
    load()
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between border-b border-gray-200 pb-4">
        <div>

          <h1 className="font-heading text-base font-semibold text-black tracking-tight">包体管理</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openCreate} className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition-all hover:bg-emerald-100 hover:text-emerald-800">
            + 新增包体
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
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80 text-[15px] tracking-[0.1em] text-gray-400">
                <th className="py-2.5 pl-4 font-medium text-[13px] text-black">ID</th>
                <th className="py-2.5 font-medium text-[13px] text-black">名称</th>
                <th className="py-2.5 font-medium text-[13px] text-black">产品</th>
                <th className="py-2.5 font-medium text-[13px] text-black">包名</th>
                <th className="py-2.5 font-medium text-[13px] text-black">平台</th>
                <th className="py-2.5 pr-4 font-medium text-right text-[13px] text-black">操作</th>
              </tr>
            </thead>
            <tbody>
              {packages.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-[15px] text-gray-400">暂无数据</td></tr>
              ) : packages.map(p => (
                <tr key={p.id} className="border-b border-gray-200/50 text-[15px] text-gray-700 hover:bg-gray-100 transition-colors">
                  <td className="py-2.5 pl-4 font-mono text-gray-400">{p.id}</td>
                  <td className="py-2.5 font-medium text-gray-800">{p.name}</td>
                  <td className="py-2.5">{p.product_name || '-'}</td>
                  <td className="py-2.5 font-mono text-gray-400">{p.package_name || '-'}</td>
                  <td className="py-2.5">{platformBadge(p.platform)}</td>
                  <td className="py-2.5 pr-4 text-right">
                    <button onClick={() => openEdit(p)} className="text-zinc-500 hover:text-gray-800 mr-2">编辑</button>
                    <button onClick={() => handleDelete(p.id)} className="text-zinc-600 hover:text-red-400">删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
        <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1) }} />
        </>
      )}

      {showModal && (
        <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? '编辑包体' : '新增包体'} maxWidth={500}>
          <form onSubmit={handleSubmit} className="space-y-4 p-5">
            {message && (
              <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2">
                <span className="text-xs text-red-600">{message}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Field label="产品">
                <select value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })} className="focus-ring w-full rounded-full border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-800 outline-none" required>
                  <option value="">请选择产品</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="名称" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="包体名称" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="包名 (Package Name)" value={form.package_name} onChange={e => setForm({ ...form, package_name: e.target.value })} placeholder="com.example.app" />
              <Field label="版本" value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} placeholder="1.0.0" />
            </div>
            <Field label="平台">
              <select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} className="focus-ring w-full rounded-full border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-800 outline-none transition-colors hover:border-gray-300">
                {platforms.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="下载地址" value={form.download_url} onChange={e => setForm({ ...form, download_url: e.target.value })} placeholder="https://..." />
            <Field label="落地页地址" value={form.landing_page_url} onChange={e => setForm({ ...form, landing_page_url: e.target.value })} placeholder="https://..." />
            <Field label="备注">
              <textarea value={form.remark} onChange={e => setForm({ ...form, remark: e.target.value })} rows={2} className="focus-ring w-full rounded-full border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-800 placeholder-gray-400 outline-none transition-colors hover:border-gray-300" />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="focus-ring rounded-full border border-gray-300 bg-white px-5 py-2 text-[13px] font-medium tracking-wide text-gray-700 transition-colors hover:bg-gray-50">取消</button>
              <button type="submit" className="focus-ring rounded-full border border-amber-500/30 bg-amber-500/10 px-5 py-2 text-[13px] font-medium tracking-wide text-amber-500 transition-all hover:border-amber-500/50 hover:bg-amber-500/15">保存</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
