'use client'

import { useState } from 'react'
import { clearApiCache } from '@/lib/apiCache'

interface RefreshButtonProps {
  onRefresh: () => void | Promise<void>
  title?: string
}

export default function RefreshButton({ onRefresh, title = '刷新' }: RefreshButtonProps) {
  const [spinning, setSpinning] = useState(false)

  return (
    <button
      type="button"
      onClick={async () => {
        setSpinning(true)
        try {
          clearApiCache()
          await onRefresh()
        } finally {
          setSpinning(false)
        }
      }}
      title={title}
      className="focus-ring flex h-[38px] w-[38px] items-center justify-center rounded-full border border-gray-300 bg-gray-100 text-gray-600 transition-all hover:bg-gray-200 hover:text-gray-900"
    >
      <svg
        className={`h-4 w-4 ${spinning ? 'animate-spin' : ''}`}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182M2.985 19.644l3.181 3.182" />
      </svg>
    </button>
  )
}
