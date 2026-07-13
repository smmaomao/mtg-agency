'use client'

import { useState, useEffect } from 'react'
import { getCached } from '@/lib/apiCache'
import { Modal } from '@/components/Modal'
import { Field } from '@/components/Field'
import { StatusSelect } from '@/components/StatusSelect'

interface WhitelistEntry {
  id: number
  token: string
  name: string
  remark: string | null
  status: number
  created_at: string
}

const defaultForm = { name: '', remark: '', status: 1 }

export default function EventsWhitelistPage() {
  const [entries, setEntries] = useState<WhitelistEntry[]>(() => {
    const cached = getCached('/api/events-whitelist')
    return cached ? (cached as any).data ?? [] : []
  })
  const [loading, setLoading] = useState(() => !getCached('/api/events-whitelist'))
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<WhitelistEntry | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState('')

  useEffect(() => { if (!getCached('/api/events-whitelist')) load() }, [])

  async function load() {
    const res = await fetch('/api/events-whitelist')
    const { data } = await res.json()
    setEntries(data || [])
    setLoading(false)
  }

  function openCreate() { setEditing(null); setForm(defaultForm); setShowModal(true) }
  function openEdit(entry: WhitelistEntry) {
    setEditing(entry)
    setForm({ name: entry.name, remark: entry.remark || '', status: entry.status })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const method = editing ? 'PUT' : 'POST'
    const body = editing ? { ...form, id: editing.id } : form
    const res = await fetch('/api/events-whitelist', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const result = await res.json()
    if (result.error) { setMessage(result.error); return }
    setShowModal(false)
    load()
  }

  async function handleRegenerate(entry: WhitelistEntry) {
    if (!confirm(`确定重新生成「${entry.name}」的 Token？旧 Token 将立即失效。`)) return
    const res = await fetch('/api/events-whitelist', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entry.id, name: entry.name, regenerate: true }),
    })
    const result = await res.json()
    if (result.error) { setMessage(result.error); return }
    load()
  }

  async function handleDelete(id: number) {
    if (!confirm('确定删除此条目？')) return
    const res = await fetch(`/api/events-whitelist?id=${id}`, { method: 'DELETE' })
    const result = await res.json()
    if (result.error) { setMessage(result.error); return }
    load()
  }

  function copyToken(token: string) {
    navigator.clipboard.writeText(token)
    setCopied(token)
    setTimeout(() => setCopied(''), 2000)
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-xl font-semibold text-black tracking-tight">回传 token 管理</h1>
          <p className="mt-1 text-sm text-gray-400">管理回传接口的访问Token，可以不设置token，多个时表示都可以使用</p>
        </div>
        <button onClick={openCreate} className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition-all hover:bg-emerald-100 hover:text-emerald-800">
          + 新增
        </button>
      </div>

      {message && (
        <div className="mb-4 border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
          {message}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="text-sm text-gray-400">加载中...</span>
        </div>
      ) : (
        <div className="border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-2.5 text-[13px] font-medium text-black">ID</th>
                <th className="px-4 py-2.5 text-[13px] font-medium text-black">名称</th>
                <th className="px-4 py-2.5 text-[13px] font-medium text-black">Token</th>
                <th className="px-4 py-2.5 text-[13px] font-medium text-black">备注</th>
                <th className="px-4 py-2.5 text-[13px] font-medium text-black">状态</th>
                <th className="px-4 py-2.5 text-right text-[13px] font-medium text-black">操作</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-sm text-gray-400">暂无数据</td></tr>
              ) : entries.map(entry => (
                <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5 text-gray-500">{entry.id}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{entry.name}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <code className="max-w-[200px] truncate rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 font-mono">{entry.token}</code>
                      <button onClick={() => copyToken(entry.token)} className="text-xs text-blue-500 hover:text-blue-700 whitespace-nowrap">
                        {copied === entry.token ? '已复制' : '复制'}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{entry.remark || '-'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                      entry.status === 1 ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${entry.status === 1 ? 'bg-green-500' : 'bg-gray-300'}`} />
                      {entry.status === 1 ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => openEdit(entry)} className="text-gray-500 hover:text-gray-900 mr-3">编辑</button>
                    <button onClick={() => handleRegenerate(entry)} className="text-gray-500 hover:text-amber-600 mr-3">重置Token</button>
                    <button onClick={() => handleDelete(entry.id)} className="text-gray-400 hover:text-red-500">删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-gray-200 px-4 py-2 text-xs text-gray-400">
            共 {entries.length} 条记录
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? '编辑 token' : '新增 token'} maxWidth={448}>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <Field label="名称">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="focus-ring w-full rounded-full border border-gray-300 px-3 py-2 text-[13px] text-gray-900 placeholder-gray-400 outline-none transition-colors hover:border-gray-400"
              required />
          </Field>
          <Field label="备注">
            <input value={form.remark} onChange={e => setForm({ ...form, remark: e.target.value })}
              className="focus-ring w-full rounded-full border border-gray-300 px-3 py-2 text-[13px] text-gray-900 placeholder-gray-400 outline-none transition-colors hover:border-gray-400"
              placeholder="可选" />
          </Field>
          <Field label="状态">
            <StatusSelect value={form.status} onChange={raw => setForm({ ...form, status: parseInt(raw) })} />
          </Field>
          {!editing && (
            <p className="text-xs text-gray-400">Token 将在创建后自动生成</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="focus-ring rounded-full border border-gray-300 bg-white px-5 py-2 text-[13px] text-gray-700 transition-colors hover:bg-gray-50">取消</button>
            <button type="submit" className="focus-ring rounded-full border border-amber-500/30 bg-amber-500/10 px-5 py-2 text-[13px] font-medium tracking-wide text-amber-500 transition-all hover:border-amber-500/50 hover:bg-amber-500/15">保存</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
