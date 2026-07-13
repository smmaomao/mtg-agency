import type { Metadata } from 'next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MTG Agency · Admin',
  description: 'Management System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=General+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@300;400;500;600&family=Syne:wght@600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        {children}
        {/* 仅在 Vercel 环境挂载，换到其他平台不会发无用请求 */}
        {process.env.VERCEL === '1' && <SpeedInsights />}
      </body>
    </html>
  )
}
