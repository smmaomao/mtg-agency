'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { pinyin } from 'pinyin-pro'
import { COUNTRIES } from '@/lib/countries'

// 预计算每个国家的搜索关键字（国家码 + 中文名 + 全拼 + 拼音首字母），用于模糊搜索。
interface Indexed {
  code: string
  name: string
  kw: string
}
const INDEXED: Indexed[] = COUNTRIES.map(c => {
  const full = pinyin(c.name, { toneType: 'none' }).replace(/\s+/g, '')
  const abbr = pinyin(c.name, { pattern: 'first', toneType: 'none' }).replace(/\s+/g, '')
  return {
    code: c.code,
    name: c.name,
    kw: `${c.code} ${c.name} ${full} ${abbr}`.toLowerCase(),
  }
})

function filterList(q: string): Indexed[] {
  const s = q.trim().toLowerCase()
  if (!s) return INDEXED
  return INDEXED.filter(i => i.kw.includes(s))
}

// 通用国家/地区选择组件。
// - multiple=false：单选，value/onChange 为单个国家码字符串。
// - multiple=true ：多选，value/onChange 为国家码字符串数组。
// 选项统一展示 "CODE-名称"，但回调里只会传出国家码。
// 支持按 国家码 / 中文名 / 拼音（全拼或首字母）搜索。
export function CountrySelect({
  value,
  onChange,
  multiple,
  placeholder = '请选择国家/地区',
  className = '',
}: {
  value: string | string[]
  onChange: (val: string | string[]) => void
  multiple?: boolean
  placeholder?: string
  className?: string
}) {
  if (multiple) {
    const selected = Array.isArray(value) ? value : []
    const toggle = (code: string) => {
      if (selected.includes(code)) onChange(selected.filter(c => c !== code))
      else onChange([...selected, code])
    }
    const [q, setQ] = useState('')
    const filtered = useMemo(() => filterList(q), [q])
    const allCodes = COUNTRIES.map(c => c.code)
    return (
      <div className={`rounded-lg border border-gray-200 bg-white ${className}`}>
        <div className="sticky top-0 border-b border-gray-100 bg-white p-2">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="搜索国家码 / 中文 / 拼音"
            className="w-full rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-[13px] outline-none transition-colors focus:border-blue-300"
          />
          <div className="mt-1 flex items-center justify-between text-[12px]">
            <span className="text-gray-400">已选 {selected.length} 项</span>
            <div className="flex gap-3">
              <button type="button" onClick={() => onChange(allCodes)} className="text-blue-500 hover:underline">全选</button>
              <button type="button" onClick={() => onChange([])} className="text-gray-400 hover:underline">清空</button>
            </div>
          </div>
        </div>
        <div className="max-h-44 overflow-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-4 text-center text-[13px] text-gray-400">无匹配结果</div>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {filtered.map(c => (
                <label key={c.code} className="flex cursor-pointer items-center gap-1.5 text-[13px] text-gray-700">
                  <input
                    type="checkbox"
                    checked={selected.includes(c.code)}
                    onChange={() => toggle(c.code)}
                    className="accent-blue-500"
                  />
                  {c.code}-{c.name}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // 单选：可搜索弹层
  const single = typeof value === 'string' ? value : ''
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const filtered = useMemo(() => filterList(q), [q])
  const current = COUNTRIES.find(c => c.code === single)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQ('')
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="focus-ring flex w-full items-center justify-between rounded-full border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-800 outline-none transition-colors hover:border-gray-300"
      >
        <span className={current ? 'text-gray-800' : 'text-gray-400'}>{current ? `${current.code}-${current.name}` : placeholder}</span>
        <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5.5 7.5 10 12l4.5-4.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 p-2">
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="搜索国家码 / 中文 / 拼音"
              className="w-full rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-[13px] outline-none transition-colors focus:border-blue-300"
            />
          </div>
          <div className="max-h-56 overflow-auto p-1">
            {filtered.length === 0 ? (
              <div className="py-4 text-center text-[13px] text-gray-400">无匹配结果</div>
            ) : (
              filtered.map(c => (
                <button
                  type="button"
                  key={c.code}
                  onClick={() => { onChange(c.code); setOpen(false); setQ('') }}
                  className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[13px] hover:bg-blue-50 ${c.code === single ? 'text-blue-600' : 'text-gray-700'}`}
                >
                  <span>{c.code}-{c.name}</span>
                  {c.code === single && (
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m5.5 10.5 2.5 2.5 6.5-6.5" />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
