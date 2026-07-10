import { Pool } from 'pg'

// 直连 PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '54322'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

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


