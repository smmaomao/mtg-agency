'use client'

import { ReactNode } from 'react'

export function Modal({
  open,
  onClose,
  title,
  maxWidth = 440,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  maxWidth?: number
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl"
        style={{ maxWidth }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <span className="text-base font-semibold tracking-[0.05em] text-gray-800">{title}</span>
          <button onClick={onClose} className="text-zinc-500 transition-colors hover:text-gray-700" type="button">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
