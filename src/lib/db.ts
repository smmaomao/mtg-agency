import { Pool } from 'pg'
import { getRequestContext } from '@/lib/request-context'

// 支持 DATABASE_URL 连接字符串，也支持单独参数
const isLocal = !process.env.DATABASE_URL && (process.env.DB_HOST || 'localhost') === 'localhost'

const poolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '54322'),
      database: process.env.DB_NAME || 'postgres',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      // Supabase 外部连接强制 SSL，本地连接不需要
      ssl: isLocal ? false : { rejectUnauthorized: false },
    }

const pool = new Pool({
  ...poolConfig,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

// [DEBUG] 完整的连接配置快照
const _pw = (poolConfig as any).password || ''
console.log('[DB DEBUG] ========== 连接配置 ==========')
console.log('[DB DEBUG] isLocal:', isLocal)
console.log('[DB DEBUG] usingConnectionString:', !!process.env.DATABASE_URL)
console.log('[DB DEBUG] host:', (poolConfig as any).host || '(from connectionString)')
console.log('[DB DEBUG] port:', (poolConfig as any).port)
console.log('[DB DEBUG] database:', (poolConfig as any).database)
console.log('[DB DEBUG] user:', (poolConfig as any).user)
console.log('[DB DEBUG] password:', _pw ? `${_pw.substring(0, 2)}***${_pw.substring(_pw.length - 2)}` : '(empty)')
console.log('[DB DEBUG] password length:', _pw.length)
console.log('[DB DEBUG] ssl:', JSON.stringify((poolConfig as any).ssl))
console.log('[DB DEBUG] DB_HOST raw value:', process.env.DB_HOST)
console.log('[DB DEBUG] DB_PORT raw value:', process.env.DB_PORT)
console.log('[DB DEBUG] DB_NAME raw value:', process.env.DB_NAME)
console.log('[DB DEBUG] DB_USER raw value:', process.env.DB_USER)
console.log('[DB DEBUG] DB_PASSWORD set:', !!process.env.DB_PASSWORD)
console.log('[DB DEBUG] DATABASE_URL set:', !!process.env.DATABASE_URL)
console.log('[DB DEBUG] ================================')



/**
 * 内部查询包装：统一记录每条 SQL 的执行耗时
 */
async function runQuery(text: string, params?: any[]) {
  const start = performance.now()
  const preview = text.replace(/\s+/g, ' ').trim().slice(0, 100)
  const paramStr = params && params.length ? ' ' + JSON.stringify(params).slice(0, 80) : ''
  // 关联当前请求（通过 withTiming 注入的 AsyncLocalStorage）
  const rid = getRequestContext()?.requestId
  const ridTag = rid ? ` rid=${rid}` : ''
  try {
    const result = await pool.query(text, params)
    const elapsed = Math.round(performance.now() - start)
    console.log(`[DB ${elapsed}ms]${ridTag} ${preview}${paramStr}`)
    return result
  } catch (err: any) {
    const elapsed = Math.round(performance.now() - start)
    console.error(`[DB ${elapsed}ms]${ridTag} ❌ ${preview}: ${err.message}`)
    throw err
  }
}

/**
 * 查询多行
 */
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const result = await runQuery(text, params)
  return result.rows as T[]
}

/**
 * 查询单行
 */
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const result = await runQuery(text, params)
  return (result.rows[0] as T) || null
}

/**
 * 插入并返回
 */
export async function insert<T = any>(table: string, data: Record<string, any>): Promise<T | null> {
  const keys = Object.keys(data)
  const values = Object.values(data)
  const placeholders = keys.map((_, i) => `$${i + 1}`)
  const text = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`
  const result = await runQuery(text, values)
  return (result.rows[0] as T) || null
}

/**
 * 更新并返回
 */
export async function update<T = any>(table: string, data: Record<string, any>, where?: string, whereParams: any[] = []): Promise<T | null> {
  const keys = Object.keys(data)
  const values = Object.values(data)
  const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ')
  const offset = keys.length
  // WHERE 子句中的占位符需整体偏移，否则会与 SET 的 $1..$n 冲突
  const whereShifted = where
    ? where.replace(/\$(\d+)/g, (_, n) => `$${parseInt(n, 10) + offset}`)
    : ''
  const text = `UPDATE ${table} SET ${setClause}${whereShifted ? ` WHERE ${whereShifted}` : ''} RETURNING *`
  const result = await runQuery(text, [...values, ...whereParams])
  return (result.rows[0] as T) || null
}

/**
 * 删除（自动处理外键约束错误）
 */
export async function del(table: string, where: string, params: any[]): Promise<boolean> {
  const text = `DELETE FROM ${table} WHERE ${where}`
  try {
    const result = await runQuery(text, params)
    return (result.rowCount ?? 0) > 0
  } catch (error: any) {
    if (error.code === '23503') {
      // 外键约束错误，返回友好提示
      const friendlyMessages: Record<string, string> = {
        'app_packages': '该包体已被其他数据引用，无法删除',
        'products': '该产品已被包体引用，无法删除',
        'customers': '该客户已被产品引用，无法删除',
        'admin_roles': '该角色已被用户引用，无法删除',
        'admin_menus': '该菜单已被角色引用，无法删除',
      }
      const msg = friendlyMessages[table] || '该数据已被其他模块引用，无法删除'
      const err = new Error(msg) as any
      err.code = '23503'
      err.friendly = true
      throw err
    }
    throw error
  }
}

/**
 * 计数
 */
export async function count(table: string, where?: string, params?: any[]): Promise<number> {
  const text = where ? `SELECT COUNT(*) as count FROM ${table} WHERE ${where}` : `SELECT COUNT(*) as count FROM ${table}`
  const result = await runQuery(text, params)
  return parseInt(result.rows[0].count)
}


