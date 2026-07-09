export default function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <a
        href="/login"
        className="group relative flex items-center gap-3 border-b border-zinc-700 pb-1 text-sm font-medium tracking-[0.2em] text-zinc-300 transition-colors hover:border-amber-500 hover:text-amber-400"
      >
        <span className="text-xs">系统入口</span>
        <svg className="h-3 w-3 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      </a>
    </div>
  )
}
