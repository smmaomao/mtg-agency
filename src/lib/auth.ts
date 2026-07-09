import { cookies } from 'next/headers'
import { jwtVerify, SignJWT } from 'jose'
import bcrypt from 'bcryptjs'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'admin-system-jwt-secret-key-2024'
)

export interface UserPayload {
  id: number
  username: string
  real_name: string
  role_id: number
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10)
}

export async function createToken(payload: UserPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<UserPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as UserPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<UserPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (!token) return null
  return verifyToken(token)
}

export function parseToken(token: string): UserPayload | null {
  try {
    const base64 = token.split('.')[1]
    const json = Buffer.from(base64, 'base64').toString()
    return JSON.parse(json)
  } catch {
    return null
  }
}
