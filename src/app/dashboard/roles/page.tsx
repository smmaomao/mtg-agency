'use client'

import { useState, useEffect } from 'react'
import { getCached } from '@/lib/apiCache'
import RefreshButton from '@/components/RefreshButton'
import { Modal } from '@/components/Modal'
import { Field } from '@/components/Field'
import { StatusSelect } from '@/components/StatusSelect'

interface Role {
  id: number
  name: string
  description: string
  menu_permissions: number[]
  status: number
}

interface MenuItem {
  id: number
  name: string
  parent_id: number
}

const defaultForm = { name: '', description: '', menu_permissions: [] as number[], status: 1 }

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>(() => {
    const cached = getCached('/api/roles')
    return cached ? (cached as any).data ?? [] : []
  })
  const [menus, setMenus] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(() => !getCached('/api/roles'))
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Role | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [message, setMessage] = useState('')

  useEffect(() => { loadRoles(); loadMenus() }, [])

  async function loadRoles() {
    const res = await fetch('/api/roles')
    const { data } = await res.json()
    setRoles(data || [])
    setLoading(false)
  }

  async function loadMenus() {
    const res = await fetch('/api/menus')
    const { data } = await res.json()
    setMenus(data || [])
  }

  function openCreate() { setEditing(null); setForm(defaultForm); setMessage(''); setShowModal(true) }
  function openEdit(role: Role) { setEditing(role); setForm({ name: role.name, description: role.description, menu_permissions: role.menu_permissions || [], status: role.status }); setMessage(''); setShowModal(true) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const method = editing ? 'PUT' : 'POST'
    const body = editing ? { ...form, id: editing.id } : form
    const res = await fetch('/api/roles', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const result = await res.json()
    if (result.error) { setMessage(result.error); return }
    setShowModal(false)
    loadRoles()
  }

  async function handleDelete(id: number) {
    if (!confirm('确定删除此角色？')) return
    const res = await fetch(`/api/roles?id=${id}`, { method: 'DELETE' })
    const result = await res.json()
    if (result.error) { setMessage(result.error); return }
    loadRoles()
  }

  function togglePerm(id: number) {
    setForm(p => {
      const isCurrentlyChecked = p.menu_permissions.includes(id)
      let newPermissions: number[]

      if (isCurrentlyChecked) {
        // 取消勾选：移除自身 + 所有子菜单
        const childIds = menus.filter(m => m.parent_id === id).map(m => m.id)
        newPermissions = p.menu_permissions.filter(i => i !== id && !childIds.includes(i))
      } else {
        // 勾选：添加自身 + 所有子菜单
        const childIds = menus.filter(m => m.parent_id === id).map(m => m.id)
        newPermissions = [...new Set([...p.menu_permissions, id, ...childIds])]
      }

      return { ...p, menu_permissions: newPermissions }
    })
  }

  const parentMenus = menus.filter(m => m.parent_id === 0)

  return (
    <div>
      <div className="mb-6 flex items-end justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="font-heading text-base font-semibold text-black tracking-tight">角色管理</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openCreate} className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition-all hover:bg-emerald-100 hover:text-emerald-800">
            + 新建角色
          </button>
          <RefreshButton onRefresh={loadRoles} />
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
        <div className="overflow-hidden border border-gray-200 bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-white">
                <th className="px-4 py-2.5 text-left text-[13px] font-medium tracking-[0.15em] text-black uppercase">ID</th>
                <th className="px-4 py-2.5 text-left text-[13px] font-medium tracking-[0.15em] text-black uppercase">角色名称</th>
                <th className="px-4 py-2.5 text-left text-[13px] font-medium tracking-[0.15em] text-black uppercase">描述</th>
                <th className="px-4 py-2.5 text-left text-[13px] font-medium tracking-[0.15em] text-black uppercase">权限</th>
                <th className="px-4 py-2.5 text-left text-[13px] font-medium tracking-[0.15em] text-black uppercase">状态</th>
                <th className="px-4 py-2.5 text-right text-[13px] font-medium tracking-[0.15em] text-black uppercase">操作</th>
              </tr>
            </thead>
            <tbody>
              {roles.map(role => {
                const permNames = (role.menu_permissions || [])
                  .map(id => menus.find(m => m.id === id)?.name)
                  .filter(Boolean)
                  .join(', ')
                return (
                  <tr key={role.id} className="group border-b border-gray-200/50 last:border-b-0 transition-colors hover:bg-gray-100">
                    <td className="px-4 py-2.5 text-[15px] tabular-nums text-gray-400">{String(role.id).padStart(3, '0')}</td>
                    <td className="px-4 py-2.5 text-[15px] font-medium text-gray-800">{role.name}</td>
                    <td className="px-4 py-2.5 text-[15px] text-gray-500">{role.description || '—'}</td>
                    <td className="max-w-[200px] truncate px-4 py-2.5 text-[15px] text-gray-400" title={permNames}>{permNames || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 text-[15px] font-medium ${
                        role.status === 1 ? 'text-green-400' : 'text-zinc-500'
                      }`}>
                        <span className={`h-1 w-1 rounded-full ${role.status === 1 ? 'bg-green-400' : 'bg-zinc-600'}`} />
                        {role.status === 1 ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(role)} className="text-[15px] font-medium text-gray-500 hover:text-gray-900">编辑</button>
                        {role.id !== 1 && (
                          <button onClick={() => handleDelete(role.id)} className="text-[15px] font-medium text-gray-400 hover:text-red-400">删除</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {roles.length === 0 && (
                <tr><td colSpan={6} className="py-16 text-center text-[15px] text-gray-400">暂无数据</td></tr>
              )}
            </tbody>
          </table>
          <div className="border-t border-gray-200 px-4 py-2 text-[15px] text-gray-400">
            共 {roles.length} 条记录
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? '编辑角色' : '新建角色'} maxWidth={440}>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {message && (
            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2">
              <span className="text-xs text-red-600">{message}</span>
            </div>
          )}
          <Field label="角色名称">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="focus-ring w-full rounded-full border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-800 placeholder-gray-400 outline-none transition-colors hover:border-gray-300" required placeholder="管理员" />
          </Field>
          <Field label="描述">
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="focus-ring w-full rounded-full border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-800 placeholder-gray-400 outline-none transition-colors hover:border-gray-300" placeholder="拥有所有权限" />
          </Field>
          <Field label="状态">
            <StatusSelect value={form.status} onChange={raw => setForm({ ...form, status: parseInt(raw) })} />
          </Field>
          <Field label="菜单权限">
            {editing && editing.id === 1 ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
                超级管理员拥有所有菜单权限，无需配置
              </div>
            ) : (
              <div className="max-h-48 space-y-0.5 overflow-y-auto border border-gray-200 bg-white p-3">
                {parentMenus.map(parent => {
                  const children = menus.filter(m => m.parent_id === parent.id)
                  return (
                    <div key={parent.id}>
                      <label className="flex cursor-pointer items-center gap-2 px-1 py-0.5 hover:bg-gray-100">
                        <input type="checkbox" checked={form.menu_permissions.includes(parent.id)} onChange={() => togglePerm(parent.id)} className="accent-amber-500 h-3 w-3" />
                        <span className="text-[11px] text-gray-700">{parent.name}</span>
                      </label>
                      {children.map(child => (
                        <label key={child.id} className="ml-5 flex cursor-pointer items-center gap-2 px-1 py-0.5 hover:bg-gray-100">
                          <input type="checkbox" checked={form.menu_permissions.includes(child.id)} onChange={() => togglePerm(child.id)} className="accent-amber-500 h-3 w-3" />
                          <span className="text-[11px] text-gray-400">├ {child.name}</span>
                        </label>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </Field>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="focus-ring flex-1 rounded-full border border-gray-200 bg-transparent py-2 text-[10px] font-medium tracking-wide text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-800">取消</button>
            <button type="submit" className="focus-ring flex-1 rounded-full border border-amber-500/30 bg-amber-500/10 py-2 text-[10px] font-medium tracking-wide text-amber-500 transition-all hover:border-amber-500/50 hover:bg-amber-500/15">
              {editing ? '保存' : '创建'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
