'use client'

import { useState, useEffect } from 'react'
import RefreshButton from '@/components/RefreshButton'
import Pagination from '@/components/Pagination'
import { Modal } from '@/components/Modal'
import { Field } from '@/components/Field'
import { StatusSelect } from '@/components/StatusSelect'

interface Customer { id: number; name: string }
interface Product { id: number; name: string; customer_id: number }
interface AppPackage { id: number; product_id: number; name: string; package_name: string | null; landing_page_url: string | null }
interface DspMapping {
  id: number
  customer_id: number | null
  product_id: number | null
  package_id: number
  dsp_name: string
  channel_name: string | null
  dsp_package_id: string | null
  status: string
  remark: string | null
  created_at: string
  package_name: string | null
  platform: string | null
}

const defaultForm = {
  customer_id: '', product_id: '', package_id: '',
  dsp_name: 'Mintegral', campuuid: '', landing_page_url: '', status: 'active', remark: '',
}

export default function DspMappingPage() {
  const [mappings, setMappings] = useState<DspMapping[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
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

  async function loadCustomers() {
    const res = await fetch('/api/customers?pageSize=1000')
    const { data } = await res.json()
    setCustomers(data || [])
  }
  async function loadProducts() {
    const res = await fetch('/api/products?pageSize=1000')
    const { data } = await res.json()
    setProducts(data || [])
  }
  async function loadPackages() {
    const res = await fetch('/api/packages?pageSize=1000')
    const { data } = await res.json()
    setPackages(data || [])
  }

  async function openCreate() {
    setEditing(null)
    setForm(defaultForm)
    setMessage('')
    await Promise.all([loadCustomers(), loadProducts(), loadPackages()])
    setShowModal(true)
  }

  async function openEdit(m: DspMapping) {
    setEditing(m)
    setMessage('')
    const [cRes, pRes, pkRes] = await Promise.all([
      fetch('/api/customers?pageSize=1000').then(r => r.json()),
      fetch('/api/products?pageSize=1000').then(r => r.json()),
      fetch('/api/packages?pageSize=1000').then(r => r.json()),
    ])
    const products = pRes.data || []
    const packages = pkRes.data || []
    setCustomers(cRes.data || [])
    setProducts(products)
    setPackages(packages)

    const pkg = packages.find((p: AppPackage) => String(p.id) === String(m.package_id))
    const prod = pkg ? products.find((pr: Product) => pr.id === pkg.product_id) : null
    const customerId = m.customer_id != null ? String(m.customer_id) : (prod ? String(prod.customer_id) : '')
    const productId = m.product_id != null ? String(m.product_id) : (pkg ? String(pkg.product_id) : '')

    setForm({
      customer_id: customerId,
      product_id: productId,
      package_id: String(m.package_id),
      dsp_name: m.dsp_name || 'Mintegral',
      campuuid: m.campuuid || '',
      landing_page_url: m.landing_page_url || '',
      status: m.status || 'active',
      remark: m.remark || '',
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const body = {
      customer_id: form.customer_id ? parseInt(form.customer_id) : null,
      product_id: form.product_id ? parseInt(form.product_id) : null,
      package_id: parseInt(form.package_id),
      dsp_name: form.dsp_name,
      channel_name: null,
      dsp_package_id: null,
      campuuid: form.campuuid || null,
      landing_page_url: form.landing_page_url || null,
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

  // 三级联动：客户 -> 产品 -> 包
  const filteredProducts = products.filter(p => String(p.customer_id) === String(form.customer_id))
  const filteredPackages = packages.filter(p => String(p.product_id) === String(form.product_id))
  const selectedPkg = packages.find(p => String(p.id) === String(form.package_id)) || null

  function onCustomerChange(val: string) {
    setForm(f => ({ ...f, customer_id: val, product_id: '', package_id: '' }))
  }
  function onProductChange(val: string) {
    setForm(f => ({ ...f, product_id: val, package_id: '' }))
  }

  const sectionTitle = (text: string) => (
    <div className="mb-1 mt-1 text-[13px] font-semibold tracking-wide text-gray-500">{text}</div>
  )

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
                <th className="py-2.5 font-medium text-[13px] text-black">campuuid</th>
                <th className="py-2.5 font-medium text-[13px] text-black">状态</th>
                <th className="py-2.5 pr-4 font-medium text-right text-[13px] text-black">操作</th>
              </tr>
            </thead>
            <tbody>
              {mappings.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-[15px] text-gray-400">暂无数据</td></tr>
              ) : mappings.map(m => (
                <tr key={m.id} className="border-b border-gray-200/50 text-[15px] text-gray-700 hover:bg-gray-100 transition-colors">
                  <td className="py-2.5 pl-4 font-mono text-gray-400">{m.id}</td>
                  <td className="py-2.5">{m.package_name || '-'}</td>
                  <td className="py-2.5 font-medium text-gray-800">{m.dsp_name}</td>
                  <td className="py-2.5 font-mono text-gray-400 text-[15px]">{m.campuuid || '-'}</td>
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
        <form onSubmit={handleSubmit} className="space-y-3 p-5">
          {message && (
            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2">
              <span className="text-xs text-red-600">{message}</span>
            </div>
          )}

          {/* 上游信息 */}
          {sectionTitle('上游信息')}
          <Field label="客户">
            <select value={form.customer_id} onChange={e => onCustomerChange(e.target.value)} className="focus-ring w-full rounded-full border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-800 outline-none" required>
              <option value="">请选择客户</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="产品">
            <select value={form.product_id} onChange={e => onProductChange(e.target.value)} disabled={!form.customer_id} className="focus-ring w-full rounded-full border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-800 outline-none disabled:bg-gray-50 disabled:text-gray-300" required>
              <option value="">{form.customer_id ? '请选择产品' : '请先选择客户'}</option>
              {filteredProducts.map(pr => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
            </select>
          </Field>
          <Field label="包">
            <select value={form.package_id} onChange={e => setForm({ ...form, package_id: e.target.value })} disabled={!form.product_id} className="focus-ring w-full rounded-full border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-800 outline-none disabled:bg-gray-50 disabled:text-gray-300" required>
              <option value="">{form.product_id ? '请选择包' : '请先选择产品'}</option>
              {filteredPackages.map(pk => <option key={pk.id} value={pk.id}>{pk.name}{pk.package_name ? ` (${pk.package_name})` : ''}</option>)}
            </select>
          </Field>
          <Field label="包名">
            <div className="rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-500">{selectedPkg?.package_name || '选择包后显示'}</div>
          </Field>
          <Field label="落地页地址">
            <div className="flex items-center gap-2">
              <input
                value={form.landing_page_url}
                onChange={e => setForm({ ...form, landing_page_url: e.target.value })}
                placeholder="手动输入落地页地址，如 https://..."
                className="focus-ring w-full rounded-full border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-800 outline-none transition-colors hover:border-gray-300"
              />
              <button
                type="button"
                disabled={!form.landing_page_url}
                onClick={() => form.landing_page_url && window.open(form.landing_page_url, '_blank', 'noopener,noreferrer')}
                className="focus-ring shrink-0 rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-[13px] font-medium text-blue-600 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-300"
              >
                跳转
              </button>
            </div>
          </Field>

          {/* 下游信息 */}
          {sectionTitle('下游信息')}
          <Field label="对应渠道">
            <select value={form.dsp_name} onChange={e => setForm({ ...form, dsp_name: e.target.value })} className="focus-ring w-full rounded-full border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-800 outline-none" required>
              <option value="Mintegral">Mintegral</option>
            </select>
          </Field>
          <Field label="campuuid" value={form.campuuid} onChange={e => setForm({ ...form, campuuid: e.target.value })} placeholder="DSP 平台广告计划 ID" />

          {/* 其他信息 */}
          {sectionTitle('其他信息')}
          <Field label="状态">
            <StatusSelect
              value={form.status}
              onChange={raw => setForm({ ...form, status: raw })}
              options={[{ value: 'active', label: '启用' }, { value: 'inactive', label: '停用' }]}
            />
          </Field>
          <Field label="备注">
            <textarea value={form.remark} onChange={e => setForm({ ...form, remark: e.target.value })} rows={3} className="focus-ring w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-800 placeholder-gray-400 outline-none transition-colors hover:border-gray-300" />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="focus-ring rounded-full border border-gray-300 bg-white px-5 py-2 text-[13px] font-medium tracking-wide text-gray-700 transition-colors hover:bg-gray-50">取消</button>
            <button type="submit" className="focus-ring rounded-full border border-amber-500/30 bg-amber-500/10 px-5 py-2 text-[13px] font-medium tracking-wide text-amber-500 transition-all hover:border-amber-500/50 hover:bg-amber-500/15">保存</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
