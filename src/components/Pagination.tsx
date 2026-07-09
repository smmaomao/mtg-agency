'use client'

interface PaginationProps {
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

const PAGE_SIZES = [20, 50, 100]

export default function Pagination({ total, page, pageSize, onPageChange, onPageSizeChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div className="mt-4 flex items-center justify-between border-t border-gray-200/60 pt-3">
      {/* Left: record range */}
      <span className="text-[13px] text-gray-400">
        显示 {start}-{end} 条，共 {total} 条
      </span>

      {/* Right: page size + arrows */}
      <div className="flex items-center gap-3">
        <select
          value={pageSize}
          onChange={e => onPageSizeChange(Number(e.target.value))}
          className="focus-ring border border-gray-200 bg-white px-2 py-1 text-[13px] text-gray-600 outline-none"
        >
          {PAGE_SIZES.map(s => (
            <option key={s} value={s}>{s} 条/页</option>
          ))}
        </select>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="flex h-7 w-7 items-center justify-center border border-gray-200 text-gray-400 transition-colors hover:text-gray-700 disabled:opacity-30"
            aria-label="上一页"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>

          <span className="px-1 text-[13px] text-gray-500">{page} / {totalPages}</span>

          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="flex h-7 w-7 items-center justify-center border border-gray-200 text-gray-400 transition-colors hover:text-gray-700 disabled:opacity-30"
            aria-label="下一页"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
