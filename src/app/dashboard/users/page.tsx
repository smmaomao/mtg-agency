'use client'

import { useState, useEffect } from 'react'
import { getCached } from '@/lib/apiCache'
import RefreshButton from '@/components/RefreshButton'
import { Modal } from '@/components/Modal'
import { Field } from '@/components/Field'
import { StatusSelect } from '@/components/StatusSelect'

interface User {
  id: number
  username: string
  real_name: string
  role_id: number | null
  status: number
  created_at: string
}

interface Role {
  id: number
  name: string
}

const defaultForm = { username: '', password: '', real_name: '', role_id: 0, status: 1 }

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(() => {
    const cached = getCached('/api/users')
    return cached ? (cached as any).data ?? [] : []
  })
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(() => !getCached('/api/users'))
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [message, setMessage] = useState('')

  useEffect(() => { if (!getCached('/api/users')) { loadUsers(); loadRoles() } }, [])

  async function loadUsers() {
    const res = await fetch('/api/users')
    const { data } = await res.json()
    setUsers(data || [])
    setLoading(false)
  }

  async function loadRoles() {
    const res = await fetch('/api/roles')
    const { data } = await res.json()
    setRoles(data || [])
  }

  function openCreate() { setEditing(null); setForm(defaultForm); setMessage(''); setShowModal(true) }
  function openEdit(user: User) { setEditing(user); setForm({ username: user.username, password: '', real_name: user.real_name, role_id: user.role_id || 0, status: user.status }); setMessage(''); setShowModal(true) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const method = editing ? 'PUT' : 'POST'
    const body: Record<string, unknown> = { username: form.username, real_name: form.real_name, role_id: form.role_id || null, status: form.status }
    if (editing) { body.id = editing.id; if (form.password) body.password = form.password }
    else { body.password = form.password }
    const res = await fetch('/api/users', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const result = await res.json()
    if (result.error) { setMessage(result.error); return }
    setShowModal(false)
    loadUsers()
  }

  async function handleDelete(id: number) {
    if (!confirm('确定删除此用户？')) return
    const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' })
    const result = await res.json()
    if (result.error) { setMessage(result.error); return }
    loadUsers()
  }

  function getRoleName(roleId: number | null) {
    if (!roleId) return '—'
    return roles.find(r => r.id === roleId)?.name || '—'
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-end justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="font-heading text-base font-semibold text-black tracking-tight">用户管理</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openCreate} className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition-all hover:bg-emerald-100 hover:text-emerald-800">
            + 新建用户
          </button>
          <RefreshButton onRefresh={loadUsers} />
        </div>
      </div>

      {message && (
        <div className="mb-4 flex items-center gap-2 rounded-sm border border-red-500/20 bg-red-50 px-3 py-2">
          <svg className="h-3 w-3 flex-shrink-0 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <span className="text-xs text-red-600">{message}</span>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="h-4 w-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="ml-2 text-xs text-gray-400">Loading records…</span>
        </div>
      ) : (
        <div className="overflow-hidden border border-gray-200 bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-white">
                <th className="px-4 py-2.5 text-left text-[13px] font-medium tracking-[0.15em] text-black uppercase">ID</th>
                <th className="px-4 py-2.5 text-left text-[13px] font-medium tracking-[0.15em] text-black uppercase">用户名</th>
                <th className="px-4 py-2.5 text-left text-[13px] font-medium tracking-[0.15em] text-black uppercase">姓名</th>
                <th className="px-4 py-2.5 text-left text-[13px] font-medium tracking-[0.15em] text-black uppercase">角色</th>
                <th className="px-4 py-2.5 text-left text-[13px] font-medium tracking-[0.15em] text-black uppercase">状态</th>
                <th className="px-4 py-2.5 text-left text-[13px] font-medium tracking-[0.15em] text-black uppercase">创建时间</th>
                <th className="px-4 py-2.5 text-right text-[13px] font-medium tracking-[0.15em] text-black uppercase">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => (
                <tr key={user.id} className="group border-b border-gray-200/50 last:border-b-0 transition-colors hover:bg-gray-100">
                  <td className="px-4 py-2.5 text-[15px] tabular-nums text-gray-400">{String(user.id).padStart(3, '0')}</td>
                  <td className="px-4 py-2.5 text-[15px] font-medium text-gray-800">{user.username}</td>
                  <td className="px-4 py-2.5 text-[15px] text-gray-500">{user.real_name || '—'}</td>
                  <td className="px-4 py-2.5 text-[15px] text-gray-500">{getRoleName(user.role_id)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center gap-1 text-[15px] font-medium ${
                      user.status === 1 ? 'text-green-400' : 'text-zinc-500'
                    }`}>
                      <span className={`h-1 w-1 rounded-full ${user.status === 1 ? 'bg-green-400' : 'bg-zinc-600'}`} />
                      {user.status === 1 ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[15px] text-gray-400 tabular-nums">
                    {new Date(user.created_at).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(user)} className="text-[15px] font-medium text-gray-500 transition-colors hover:text-gray-900">编辑</button>
                      {user.id !== 1 && (
                        <button onClick={() => handleDelete(user.id)} className="text-[15px] font-medium text-gray-400 transition-colors hover:text-red-400">删除</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-[15px] text-gray-400">暂无数据</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="border-t border-gray-200 px-4 py-2 text-[15px] text-gray-400">
            共 {users.length} 条记录
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? '编辑用户' : '新建用户'} maxWidth={400}>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {message && (
            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2">
              <span className="text-xs text-red-600">{message}</span>
            </div>
          )}
          <Field label="用户名" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required placeholder="请输入用户名" />
          <Field label={editing ? '密码' : '密码 *'} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required={!editing} placeholder={editing ? '留空则不修改' : '请输入密码'} />
          <Field label="姓名" value={form.real_name} onChange={e => setForm({ ...form, real_name: e.target.value })} placeholder="请输入姓名" />
          <Field label="角色">
            <select value={form.role_id} onChange={e => setForm({ ...form, role_id: parseInt(e.target.value) })} className="focus-ring w-full rounded-full border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-800 outline-none transition-colors hover:border-gray-300">
              <option value={0}>未分配</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
          <Field label="状态">
            <StatusSelect value={form.status} onChange={raw => setForm({ ...form, status: parseInt(raw) })} />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="focus-ring rounded-full border border-gray-300 bg-white px-5 py-2 text-[13px] font-medium tracking-wide text-gray-700 transition-colors hover:bg-gray-50">取消</button>
            <button type="submit" className="focus-ring rounded-full border border-amber-500/30 bg-amber-500/10 px-5 py-2 text-[13px] font-medium tracking-wide text-amber-500 transition-all hover:border-amber-500/50 hover:bg-amber-500/15">
              保存
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
