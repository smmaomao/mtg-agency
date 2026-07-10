import { Pool } from 'pg'

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

// [DEBUG] 启动时立即测试连接
;(async () => {
  console.log('[DB TEST] 开始测试连接...')
  let client

  // 先测 DNS
  const host = (poolConfig as any).host
  if (host) {
    try {
      const dnsStart = Date.now()
      console.log('[DB TEST] DNS 解析 host:', host)
      const dns = await import('dns').then(m => m.promises)
      const addrs = await dns.resolve4(host)
      console.log('[DB TEST] DNS 解析成功 (' + (Date.now() - dnsStart) + 'ms):', JSON.stringify(addrs))
    } catch (dnsErr: any) {
      console.error('[DB TEST] ❌ DNS 解析失败:', dnsErr.code || dnsErr.message)
    }
  }

  // TCP 连通性测试
  const testHost = host || 'localhost'
  const testPort = (poolConfig as any).port || 5432
  console.log('[DB TEST] TCP 连接测试 ' + testHost + ':' + testPort)
  try {
    const netStart = Date.now()
    const net = await import('net')
    await new Promise<void>((resolve, reject) => {
      const sock = new net.Socket()
      sock.setTimeout(5000)
      sock.on('connect', () => {
        console.log('[DB TEST] TCP 连接成功 (' + (Date.now() - netStart) + 'ms)')
        sock.destroy()
        resolve()
      })
      sock.on('error', (e: any) => {
        console.error('[DB TEST] ❌ TCP 连接失败:', e.code || e.message)
        sock.destroy()
        reject(e)
      })
      sock.on('timeout', () => {
        console.error('[DB TEST] ❌ TCP 连接超时 (5s)')
        sock.destroy()
        reject(new Error('TCP timeout'))
      })
      sock.connect(testPort, testHost)
    })
  } catch (tcpErr: any) {
    console.error('[DB TEST] TCP 阶段无法连接，跳过 pg 连接测试')
    console.log('[DB TEST] 测试结束（网络不通）')
    return
  }

  // pg 连接测试，带显式超时
  try {
    console.log('[DB TEST] 开始 pg 连接...')
    const connectTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('pg connect timeout (8s)')), 8000)
    )
    client = await Promise.race([pool.connect(), connectTimeout])
    console.log('[DB TEST] pg 连接成功')
    const result = await client.query('SELECT 1 as test')
    console.log('[DB TEST] ✅ 数据库查询成功:', JSON.stringify(result.rows[0]))
  } catch (err: any) {
    console.error('[DB TEST] ❌ 数据库连接失败:', err.message)
    console.error('[DB TEST] 错误码:', err.code)
  } finally {
    if (client) client.release()
    console.log('[DB TEST] 测试结束')
  }
})()

/**
 * 查询多行
 */
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const result = await pool.query(text, params)
  return result.rows as T[]
}

/**
 * 查询单行
 */
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const result = await pool.query(text, params)
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
  const result = await pool.query(text, values)
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
  const result = await pool.query(text, [...values, ...whereParams])
  return (result.rows[0] as T) || null
}

/**
 * 删除
 */
export async function del(table: string, where: string, params: any[]): Promise<boolean> {
  const text = `DELETE FROM ${table} WHERE ${where}`
  const result = await pool.query(text, params)
  return (result.rowCount ?? 0) > 0
}

/**
 * 计数
 */
export async function count(table: string, where?: string, params?: any[]): Promise<number> {
  const text = where ? `SELECT COUNT(*) as count FROM ${table} WHERE ${where}` : `SELECT COUNT(*) as count FROM ${table}`
  const result = await pool.query(text, params)
  return parseInt(result.rows[0].count)
}


