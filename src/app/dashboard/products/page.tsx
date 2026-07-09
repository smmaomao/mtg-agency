'use client'

import { useState, useEffect } from 'react'
import { getCached } from '@/lib/apiCache'
import RefreshButton from '@/components/RefreshButton'
import Pagination from '@/components/Pagination'
import { Modal } from '@/components/Modal'
import { Field } from '@/components/Field'

interface Customer { id: number; name: string }
interface Product {
  id: number
  name: string
  customer_id: number
  product_type: string | null
  remark: string | null
  icon_url: string | null
  description: string | null
  countries: string[] | null
  created_at: string
  customers: { name: string } | null
}

const defaultForm = {
  name: '', customer_id: '', product_type: 'game', remark: '', icon_url: '', description: '', countries: '',
}
const productTypes = ['game', 'app', 'tool', 'other']

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [message, setMessage] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(20)

  useEffect(() => { load() }, [page])

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/products?page=${page}&pageSize=${pageSize}`)
    const { data, total: t } = await res.json()
    setProducts(data || [])
    setTotal(t || 0)
    setLoading(false)
  }

  async function loadCustomers() {
    const res = await fetch('/api/customers?pageSize=1000')
    const { data } = await res.json()
    setCustomers(data || [])
  }

  function openCreate() { setEditing(null); setForm(defaultForm); setMessage(''); loadCustomers(); setShowModal(true) }
  function openEdit(p: Product) {
    setEditing(p)
    setForm({
      name: p.name, customer_id: String(p.customer_id), product_type: p.product_type || 'game',
      remark: p.remark || '', icon_url: p.icon_url || '', description: p.description || '',
      countries: p.countries?.join(', ') || '',
    })
     setMessage(''); loadCustomers(); setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const countries = form.countries ? form.countries.split(',').map(s => s.trim()).filter(Boolean) : null
    const body = {
      name: form.name,
      customer_id: parseInt(form.customer_id),
      product_type: form.product_type,
      remark: form.remark || null,
      icon_url: form.icon_url || null,
      description: form.description || null,
      countries,
    }
    const method = editing ? 'PUT' : 'POST'
    const payload = editing ? { ...body, id: editing.id } : body
    const res = await fetch('/api/products', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const result = await res.json()
    if (result.error) { setMessage(result.error); return }
    setShowModal(false); load()
  }

  async function handleDelete(id: number) {
    if (!confirm('确定删除此产品？')) return
    const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' })
    const result = await res.json()
    if (result.error) { setMessage(result.error); return }
    load()
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between border-b border-gray-200 pb-4">
        <div>

          <h1 className="font-heading text-base font-semibold text-black tracking-tight">产品管理</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openCreate} className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition-all hover:bg-emerald-100 hover:text-emerald-800">
            + 新增产品
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
        <div className="border border-gray-200 bg-white">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 text-[15px] tracking-[0.1em] text-gray-400">
                <th className="py-2.5 pl-4 font-medium text-[13px] text-black">ID</th>
                <th className="py-2.5 font-medium text-[13px] text-black">产品名称</th>
                <th className="py-2.5 font-medium text-[13px] text-black">客户</th>
                <th className="py-2.5 font-medium text-[13px] text-black">类型</th>
                <th className="py-2.5 font-medium text-[13px] text-black">地区</th>
                <th className="py-2.5 font-medium text-[13px] text-black">描述</th>
                <th className="py-2.5 pr-4 font-medium text-right text-[13px] text-black">操作</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-[15px] text-gray-400">暂无数据</td></tr>
              ) : products.map(p => (
                <tr key={p.id} className="border-b border-gray-200/50 text-[15px] text-gray-700 hover:bg-gray-100 transition-colors">
                  <td className="py-2.5 pl-4 font-mono text-gray-400">{p.id}</td>
                  <td className="py-2.5 font-medium text-gray-800">{p.name}</td>
                  <td className="py-2.5">{p.customers?.name || '-'}</td>
                  <td className="py-2.5">
                    <span className="rounded-sm bg-gray-100 px-1.5 py-0.5 text-[15px] text-gray-500">{p.product_type || '-'}</span>
                  </td>
                  <td className="py-2.5">{(p.countries && p.countries.length > 0) ? p.countries.join(', ') : '-'}</td>
                  <td className="py-2.5 max-w-[200px] truncate text-gray-400">{p.description || '-'}</td>
                  <td className="py-2.5 pr-4 text-right">
                    <button onClick={() => openEdit(p)} className="text-zinc-500 hover:text-gray-800 mr-2">编辑</button>
                    <button onClick={() => handleDelete(p.id)} className="text-zinc-600 hover:text-red-400">删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1) }} />
        </>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? '编辑产品' : '新增产品'} maxWidth={460}>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {message && (
            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2">
              <span className="text-xs text-red-600">{message}</span>
            </div>
          )}
          <Field label="产品名称" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <Field label="客户">
            <select value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })} className="focus-ring w-full rounded-full border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-800 outline-none" required>
              <option value="">请选择客户</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="产品类型">
            <select value={form.product_type} onChange={e => setForm({ ...form, product_type: e.target.value })} className="focus-ring w-full rounded-full border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-800 outline-none transition-colors hover:border-gray-300">
              {productTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="地区 (多选用逗号分隔)" value={form.countries} onChange={e => setForm({ ...form, countries: e.target.value })} placeholder="中国, 美国, 日本" />
          <Field label="Icon URL" value={form.icon_url} onChange={e => setForm({ ...form, icon_url: e.target.value })} />
          <Field label="描述">
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="focus-ring w-full rounded-full border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-800 placeholder-gray-400 outline-none transition-colors hover:border-gray-300" />
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
