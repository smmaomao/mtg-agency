'use client'

import { useState, useEffect } from 'react'
import { getCached } from '@/lib/apiCache'
import RefreshButton from '@/components/RefreshButton'
import Pagination from '@/components/Pagination'
import { Modal } from '@/components/Modal'
import { Field } from '@/components/Field'

interface Customer {
  id: number
  name: string
  contact_person: string | null
  contact_phone: string | null
  email: string | null
  open_date: string
  remark: string | null
  created_at: string
}

const defaultForm = {
  name: '', contact_person: '', contact_phone: '', email: '', open_date: new Date().toISOString().slice(0, 10), remark: '',
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [message, setMessage] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(20)

  useEffect(() => { load() }, [page])

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/customers?page=${page}&pageSize=${pageSize}`)
    const { data, total: t } = await res.json()
    setCustomers(data || [])
    setTotal(t || 0)
    setLoading(false)
  }

  function openCreate() { setEditing(null); setForm(defaultForm); setMessage(''); setShowModal(true) }
  function openEdit(c: Customer) { setEditing(c); setForm({ name: c.name, contact_person: c.contact_person || '', contact_phone: c.contact_phone || '', email: c.email || '', open_date: c.open_date?.slice(0, 10) || '', remark: c.remark || '' }); setMessage(''); setShowModal(true) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const method = editing ? 'PUT' : 'POST'
    const body = editing ? { ...form, id: editing.id } : form
    const res = await fetch('/api/customers', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const result = await res.json()
    if (result.error) { setMessage(result.error); return }
    setShowModal(false); load()
  }

  async function handleDelete(id: number) {
    if (!confirm('确定删除此客户？')) return
    const res = await fetch(`/api/customers?id=${id}`, { method: 'DELETE' })
    const result = await res.json()
    if (result.error) { setMessage(result.error); return }
    load()
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between border-b border-gray-200 pb-4">
        <div>

          <h1 className="font-heading text-base font-semibold text-black tracking-tight">客户管理</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openCreate} className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition-all hover:bg-emerald-100 hover:text-emerald-800">
            + 新增客户
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
                <th className="py-2.5 font-medium text-[13px] text-black">客户名称</th>
                <th className="py-2.5 font-medium text-[13px] text-black">联系人</th>
                <th className="py-2.5 font-medium text-[13px] text-black">电话</th>
                <th className="py-2.5 font-medium text-[13px] text-black">邮箱</th>
                <th className="py-2.5 font-medium text-[13px] text-black">开通日期</th>
                <th className="py-2.5 pr-4 font-medium text-right text-[13px] text-black">操作</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-[15px] text-gray-400">暂无数据</td></tr>
              ) : customers.map(c => (
                <tr key={c.id} className="border-b border-gray-200/50 text-[15px] text-gray-700 hover:bg-gray-100 transition-colors">
                  <td className="py-2.5 pl-4 font-mono text-gray-400">{c.id}</td>
                  <td className="py-2.5 font-medium text-gray-800">{c.name}</td>
                  <td className="py-2.5">{c.contact_person || '-'}</td>
                  <td className="py-2.5">{c.contact_phone || '-'}</td>
                  <td className="py-2.5">{c.email || '-'}</td>
                  <td className="py-2.5">{c.open_date?.slice(0, 10)}</td>
                  <td className="py-2.5 pr-4 text-right">
                    <button onClick={() => openEdit(c)} className="text-zinc-500 hover:text-gray-800 mr-2">编辑</button>
                    <button onClick={() => handleDelete(c.id)} className="text-zinc-600 hover:text-red-400">删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1) }} />
        </>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? '编辑客户' : '新增客户'} maxWidth={420}>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {message && (
            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2">
              <span className="text-xs text-red-600">{message}</span>
            </div>
          )}
          <Field label="客户名称" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <Field label="联系人" value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} />
          <Field label="电话" value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} />
          <Field label="邮箱" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} type="email" />
          <Field label="开通日期" value={form.open_date} onChange={e => setForm({ ...form, open_date: e.target.value })} type="date" required />
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
