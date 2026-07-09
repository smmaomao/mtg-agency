import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/server'
import { verifyPassword, createToken } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ success: false, message: '请输入账号和密码' }, { status: 400 })
    }

    const { data: user, error } = await supabase
      .from('admin_users')
      .select('id, username, real_name, role_id, password_hash, status')
      .eq('username', username)
      .single()

    if (error || !user) {
      return NextResponse.json({ success: false, message: '账号或密码错误' }, { status: 401 })
    }

    if (user.status === 0) {
      return NextResponse.json({ success: false, message: '账号已被禁用' }, { status: 403 })
    }

    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ success: false, message: '账号或密码错误' }, { status: 401 })
    }

    const token = await createToken({
      id: user.id,
      username: user.username,
      real_name: user.real_name,
      role_id: user.role_id,
    })

    const response = NextResponse.json({ success: true })
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24h
      path: '/',
    })

    return response
  } catch (e) {
    console.error('Login error:', e)
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 })
  }
}
