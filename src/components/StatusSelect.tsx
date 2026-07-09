'use client'

export function StatusSelect({
  value,
  onChange,
  options,
}: {
  value: string | number
  onChange: (raw: string) => void
  options?: { value: string | number; label: string }[]
}) {
  const active = value === 1 || value === '1' || value === 'active'
  const cls = active
    ? 'border-green-300 bg-green-50 text-green-700'
    : 'border-red-300 bg-red-50 text-red-700'
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`focus-ring w-full rounded-full border px-3 py-2 text-[13px] outline-none transition-colors ${cls}`}
    >
      {options
        ? options.map(o => (
            <option key={String(o.value)} value={o.value}>
              {o.label}
            </option>
          ))
        : (
          <>
            <option value={1}>启用</option>
            <option value={0}>禁用</option>
          </>
        )}
    </select>
  )
}
