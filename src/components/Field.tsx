'use client'

import { ReactNode } from 'react'

export function Field({
  label,
  required,
  value,
  onChange,
  type = 'text',
  placeholder,
  list,
  children,
}: {
  label: string
  required?: boolean
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string
  placeholder?: string
  list?: string
  children?: ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children ?? (
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          list={list}
          className="focus-ring w-full rounded-full border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-800 placeholder-gray-400 outline-none transition-colors hover:border-gray-300"
          required={required}
        />
      )}
    </div>
  )
}
