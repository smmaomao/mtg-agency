import { withTiming } from '../../../lib/timing'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30 // 给足超时时间

export const GET = withTiming(async () => {
  const logs: string[] = []
  const log = (msg: string) => { console.log(msg); logs.push(msg) }
  const errLog = (msg: string) => { console.error(msg); logs.push(msg) }

  const host = process.env.DB_HOST
  const port = parseInt(process.env.DB_PORT || '6543')
  const database = process.env.DB_NAME || 'postgres'
  const user = process.env.DB_USER || 'postgres'
  const password = process.env.DB_PASSWORD || ''
  const connectionString = process.env.DATABASE_URL

  // 密码字节级检查，发现空格/隐藏字符
  const pwBytes = Buffer.from(password, 'utf-8')
  const hasSpace = password.includes(' ')
  const hasNewline = password.includes('\n') || password.includes('\r')
  const firstByte = pwBytes.length > 0 ? pwBytes.readUInt8(0).toString(16) : 'none'
  const lastByte = pwBytes.length > 0 ? pwBytes.readUInt8(pwBytes.length - 1).toString(16) : 'none'
  const hasNonPrintable = pwBytes.some((b: number) => b > 0 && (b < 32 || b > 126))

  log(`[DB-TEST] === 开始诊断 ===`)
  log(`[DB-TEST] host: ${host}`)
  log(`[DB-TEST] port: ${port}`)
  log(`[DB-TEST] database: ${database}`)
  log(`[DB-TEST] user: ${user}`)
  log(`[DB-TEST] password length: ${password.length}`)
  log(`[DB-TEST] 首字节: 0x${firstByte}, 末字节: 0x${lastByte}`)
  log(`[DB-TEST] 含空格: ${hasSpace}, 含换行: ${hasNewline}, 含不可打印字符: ${hasNonPrintable}`)
  log(`[DB-TEST] DATABASE_URL: ${!!connectionString}`)

  // 1. DNS 测试
  if (host) {
    try {
      const dns = await import('dns').then(m => m.promises)
      const addrs = await dns.resolve4(host)
      log(`[DB-TEST] DNS IPv4: ${JSON.stringify(addrs)}`)
      try {
        const addrs6 = await dns.resolve6(host)
        log(`[DB-TEST] DNS IPv6: ${JSON.stringify(addrs6)}`)
      } catch { log(`[DB-TEST] DNS IPv6: 无`) }
    } catch (e: any) {
      errLog(`[DB-TEST] DNS 失败: ${e.code || e.message}`)
    }
  }

  // 2. TCP 连通性
  if (host) {
    try {
      const net = await import('net')
      const tcpResult = await new Promise<string>((resolve, reject) => {
        const sock = new net.Socket()
        sock.setTimeout(5000)
        sock.on('connect', () => { sock.destroy(); resolve('成功') })
        sock.on('error', (e: any) => reject(new Error(e.code || e.message)))
        sock.on('timeout', () => { sock.destroy(); reject(new Error('timeout')) })
        sock.connect(port, host)
      })
      log(`[DB-TEST] TCP ${host}:${port}: ${tcpResult}`)
    } catch (e: any) {
      errLog(`[DB-TEST] TCP 失败: ${e.message}`)
      return NextResponse.json({ status: 'TCP_FAIL', logs })
    }
  }

  // 3. pg 连接测试 - 用单次 Client 而不是 Pool，更好定位问题
  log(`[DB-TEST] 开始 pg 连接 (10s 超时)...`)

  try {
    const config: any = connectionString
      ? { connectionString, ssl: { rejectUnauthorized: false } }
      : { host, port, database, user, password, ssl: { rejectUnauthorized: false } }

    // 使用动态 import pg 确保不共用之前的 pool
    const { Client } = await import('pg')

    const client = new Client({
      ...config,
      connectionTimeoutMillis: 10000,
    })

    const pgResult = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        client.end().catch(() => {})
        reject(new Error('pg connect timeout (10s)'))
      }, 10000)

      client.connect()
        .then(() => {
          clearTimeout(timeout)
          return client.query('SELECT 1 as test')
        })
        .then((res: any) => {
          clearTimeout(timeout)
          client.end().catch(() => {})
          resolve(`✅ 成功: ${JSON.stringify(res.rows[0])}`)
        })
        .catch((err: any) => {
          clearTimeout(timeout)
          client.end().catch(() => {})
          reject(err)
        })
    })

    log(`[DB-TEST] ${pgResult}`)
  } catch (err: any) {
    errLog(`[DB-TEST] ❌ pg 失败: ${err.message}`)
    errLog(`[DB-TEST] 错误码: ${err.code || 'none'}`)
    if (err.routine) errLog(`[DB-TEST] routine: ${err.routine}`)
    if (err.line) errLog(`[DB-TEST] 行号: ${err.line}`)
    return NextResponse.json({ status: 'PG_FAIL', error: err.message, code: err.code, logs })
  }

  log(`[DB-TEST] === 诊断完成 ===`)
  return NextResponse.json({ status: 'OK', logs })
})
