'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (data.success) {
        router.push('/dashboard/menus')
      } else {
        setError(data.message || '登录失败')
      }
    } catch {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-8">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/bg-2.jpg)' }} />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-[440px] rounded-2xl border border-zinc-200 bg-white/80 p-10 shadow-2xl backdrop-blur-xl">
        {/* Logo */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
            <span className="font-display text-xl font-bold text-amber-400">M</span>
          </div>
          <div>
            <span className="text-lg font-semibold text-zinc-900 tracking-wide">MTG Agency</span>
            <span className="block text-[11px] tracking-[0.15em] text-zinc-500 mt-0.5">管理系统</span>
          </div>
        </div>

        <h2 className="font-display text-3xl font-bold text-zinc-900 mb-2">欢迎回来</h2>
        <p className="text-base text-zinc-500 mb-8">请输入您的账号密码登录系统</p>

        {error && (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-50 px-4 py-3">
              <svg className="h-5 w-5 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              <span className="text-sm text-red-600">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">用户名</label>
            <div className="relative">
              <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="hero-input focus-ring w-full rounded-full border border-blue-200 bg-blue-50 py-3.5 pl-12 pr-4 text-base text-zinc-900 placeholder-zinc-400 outline-none transition-all hover:border-blue-300"
                placeholder="请输入用户名"
                required
                autoComplete="off"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">密码</label>
            <div className="relative">
              <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="hero-input focus-ring w-full rounded-full border border-blue-200 bg-blue-50 py-3.5 pl-12 pr-4 text-base text-zinc-900 placeholder-zinc-400 outline-none transition-all hover:border-blue-300"
                placeholder="请输入密码"
                required
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="group mt-2 w-full rounded-full bg-amber-500 py-3.5 text-base font-semibold tracking-wide text-black transition-all hover:bg-amber-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  登录中...
                </>
              ) : (
                <>
                  登录
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </span>
          </button>
        </form>

        <div className="mt-8 text-center">
          <span className="text-xs tracking-[0.1em] text-zinc-400">
            MTG Agency · 后台管理系统
          </span>
        </div>
      </div>
    </div>
  )
}
