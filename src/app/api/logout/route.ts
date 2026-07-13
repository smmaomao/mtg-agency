import { withTiming } from '../../../lib/timing'
import { NextResponse } from 'next/server'

export const POST = withTiming(async () => {
  const response = NextResponse.json({ success: true })
  response.cookies.set('admin_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
})
