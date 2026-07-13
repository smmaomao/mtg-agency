import { NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { verifyPassword, createToken } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { username, password, remember } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ success: false, message: '请输入账号和密码' }, { status: 400 })
    }

    const user = await queryOne<{
      id: number; username: string; real_name: string; role_id: number; password_hash: string; status: number
    }>('SELECT id, username, real_name, role_id, password_hash, status FROM mtg_agency.admin_users WHERE username = $1', [username])

    if (!user) {
      return NextResponse.json({ success: false, message: '账号或密码错误' }, { status: 401 })
    }

    if (user.status === 0) {
      return NextResponse.json({ success: false, message: '账号已被禁用' }, { status: 403 })
    }

    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ success: false, message: '账号或密码错误' }, { status: 401 })
    }

    // 有效期由后端控制，仅依据 remember 布尔值决定，忽略前端可能传入的过大值
    const maxAge = remember ? 60 * 60 * 24 * 7 : 60 * 60 * 24 * 3
    const token = await createToken({
      id: user.id,
      username: user.username,
      real_name: user.real_name,
      role_id: user.role_id,
    }, remember ? '7d' : '3d')

    const response = NextResponse.json({ success: true })
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/',
    })

    return response
  } catch (e: any) {
    console.error('Login error:', e)
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 })
  }
}
