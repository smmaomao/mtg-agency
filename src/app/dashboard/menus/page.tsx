'use client'

import { useState, useEffect } from 'react'
import { getCached } from '@/lib/apiCache'
import RefreshButton from '@/components/RefreshButton'
import { Modal } from '@/components/Modal'
import { Field } from '@/components/Field'

interface Menu {
  id: number
  name: string
  path: string
  icon: string
  parent_id: number
  sort_order: number
}

const defaultForm = { name: '', path: '', icon: '', parent_id: 0, sort_order: 0 }

export default function MenusPage() {
  const [menus, setMenus] = useState<Menu[]>(() => {
    const cached = getCached('/api/menus')
    return cached ? (cached as any).data ?? [] : []
  })
  const [loading, setLoading] = useState(() => !getCached('/api/menus'))
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Menu | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [message, setMessage] = useState('')

  useEffect(() => { if (!getCached('/api/menus')) loadMenus() }, [])

  async function loadMenus() {
    const res = await fetch('/api/menus')
    const { data } = await res.json()
    setMenus(data || [])
    setLoading(false)
  }

  function openCreate(parentId = 0) { setEditing(null); setForm({ ...defaultForm, parent_id: parentId }); setMessage(''); setShowModal(true) }
  function openEdit(menu: Menu) { setEditing(menu); setForm({ name: menu.name, path: menu.path, icon: menu.icon, parent_id: menu.parent_id, sort_order: menu.sort_order }); setMessage(''); setShowModal(true) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const method = editing ? 'PUT' : 'POST'
    const body = editing ? { ...form, id: editing.id } : form
    const res = await fetch('/api/menus', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const result = await res.json()
    if (result.error) { setMessage(result.error); return }
    setShowModal(false)
    loadMenus()
  }

  async function handleDelete(id: number) {
    if (!confirm('确定删除此菜单？子菜单也会被删除。')) return
    const res = await fetch(`/api/menus?id=${id}`, { method: 'DELETE' })
    const result = await res.json()
    if (result.error) { setMessage(result.error); return }
    loadMenus()
  }

  const parentMenus = menus.filter(m => m.parent_id === 0)

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-end justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="font-heading text-base font-semibold text-black tracking-tight">菜单管理</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openCreate()} className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition-all hover:bg-emerald-100 hover:text-emerald-800">
            + 新建菜单
          </button>
          <RefreshButton onRefresh={loadMenus} />
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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="h-4 w-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : (
        <div className="space-y-2">
          {parentMenus.map((parent, i) => {
            const children = menus.filter(m => m.parent_id === parent.id)
            return (
              <div key={parent.id} className="border border-gray-200 bg-white">
                {/* Parent row */}
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="rounded-sm bg-gray-100 px-1.5 py-0.5 text-[15px] font-mono tabular-nums text-gray-400">{parent.sort_order}</span>
                    <span className="text-[15px] font-medium text-gray-800">{parent.name}</span>
                    {parent.path && (
                      <span className="rounded-sm bg-gray-100 px-1.5 py-0.5 text-[15px] font-mono text-gray-400">{parent.path}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openCreate(parent.id)} className="text-[15px] font-medium text-amber-500/60 transition-colors hover:text-amber-500">+ 添加子项</button>
                    <button onClick={() => openEdit(parent)} className="text-[15px] font-medium text-gray-400 transition-colors hover:text-gray-800">编辑</button>
                    {parentMenus.length > 1 && (
                      <button onClick={() => handleDelete(parent.id)} className="text-[15px] font-medium text-zinc-600 transition-colors hover:text-red-400">删除</button>
                    )}
                  </div>
                </div>

                {/* Children */}
                {children.length > 0 ? (
                  <div className="divide-y divide-gray-200/50">
                    {children.map(child => (
                      <div key={child.id} className="flex items-center justify-between px-4 py-2 pl-8">
                        <div className="flex items-center gap-3">
                          <span className="rounded-sm bg-gray-100 px-1.5 py-0.5 text-[15px] font-mono tabular-nums text-gray-400">{child.sort_order}</span>
                          <span className="text-[15px] text-gray-700">{child.name}</span>
                          {child.path && (
                            <span className="rounded-sm bg-gray-100 px-1.5 py-0.5 text-[15px] font-mono text-gray-400">{child.path}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(child)} className="text-[15px] font-medium text-gray-400 transition-colors hover:text-gray-800">编辑</button>
                          <button onClick={() => handleDelete(child.id)} className="text-[15px] font-medium text-zinc-600 transition-colors hover:text-red-400">删除</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-3 text-center text-[15px] text-gray-400 italic">暂无子菜单</div>
                )}
              </div>
            )
          })}
          {parentMenus.length === 0 && (
            <div className="flex flex-col items-center justify-center border border-gray-200 py-20 text-center">
              <span className="text-2xl opacity-20 mb-3">∅</span>
              <span className="text-[15px] text-gray-400">暂无菜单数据</span>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? '编辑菜单' : '新建菜单'} maxWidth={400}>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {message && (
            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2">
              <span className="text-xs text-red-600">{message}</span>
            </div>
          )}
          <Field label="名称" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="菜单名称" />
          <Field label="路由路径" value={form.path} onChange={e => setForm({ ...form, path: e.target.value })} placeholder="/dashboard/menus" />
          <Field label="图标标识" value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="menu, settings, users..." />
          <Field label="上级菜单">
            <select value={form.parent_id} onChange={e => setForm({ ...form, parent_id: parseInt(e.target.value) })} className="focus-ring w-full rounded-full border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-800 outline-none transition-colors hover:border-gray-300">
              <option value={0}>顶级菜单</option>
              {parentMenus.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          <Field label="排序">
            <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} className="focus-ring w-full rounded-full border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-800 outline-none transition-colors hover:border-gray-300" />
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
