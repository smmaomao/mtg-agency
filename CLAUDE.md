<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# 项目技术说明（MTG Agency）

## 概述
MTG Agency 是一套**广告归因回传（Postback / S2S）转发服务 + 内部管理后台**：
- 对外：接收 Adjust / AppsFlyer 等 MMP 或广告主 S2S 发送的转化回传，原样转发至下游归因平台（当前下游为 `http://postback.mintegral.net`），并记录回传日志。
- 对内：提供管理后台，维护客户 / 产品 / 包体 / 包映射（campuuid）等数据，并拉取下游报表。

## 技术栈
- 框架：Next.js 16（App Router）+ React 19 + TypeScript
- 样式：Tailwind CSS v4
- 数据库：PostgreSQL（Supabase，事务池 6543 端口），`pg` 连接池
- 鉴权：`jose`（HS256 JWT）+ `bcryptjs`
- 其他：`pinyin-pro`、`@vercel/speed-insights`
- ⚠️ 本项目 Next.js 为定制版本（16.2.10），部分 API 与官方训练数据不同。**写代码前先读 `node_modules/next/dist/docs/`**。

## 目录与架构
- `src/app/install`、`src/app/event`、`src/app/api/events`：对外回传接收端点（HTTP GET，Query 传参），**不校验 token**，剥离 `token` 参数后原样转发下游。
- `src/app/dashboard/*`：管理后台页面（均为 `'use client'`，keep-alive 标签切换，无路由跳转）。
- `src/app/api/*`：后台 CRUD / 登录 / 报表拉取接口。`/api/*` 受 `middleware.ts` 保护（除 `/api/login`）。
- `src/lib/db.ts`：pg 连接池 + `query / queryOne / insert / update / del / count` 封装（含外键友好报错）。
- `src/lib/auth.ts`：JWT 签发/校验、bcrypt 校验。
- `src/middleware.ts`：对 `/dashboard` 与 `/api` 路径做登录态校验（cookie `admin_token`）。
- `src/lib/audit.ts`：操作审计日志（自动跳过 `callback_logs` / `report_pull_logs` / `audit_logs` 三类日志表）。

## 数据模型（schema：`mtg_agency`）
- 系统：`admin_users` / `admin_roles` / `admin_menus`
- 业务（一对多链路）：`customers` → `products`（customer_id）→ `app_packages`（product_id）→ `packages_dsp_mapping`（package_id，含 `campuuid`）
- 日志：`callback_logs`（回传日志）、`report_pull_logs`（报表拉取日志）、`audit_logs`（操作日志）
- 完整建表见 `supabase-schema.sql`（在 Supabase SQL Editor 执行一次即可）。

## 环境变量
| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 连接串（若设置则优先使用；Supabase 事务池用 6543） |
| `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD` | 分项数据库连接（本地默认 localhost:54322）。<br>**若未设 `DATABASE_URL`，则使用这组分项变量连接。** |
| `JWT_SECRET` | JWT 签名密钥，**生产务必设置**（缺省有 fallback 值，仅本地用） |
| `MOCK_FORWARD=true` | 仅本地开发：跳过真实转发、直接标记成功。**线上不要配置** |
| `NODE_ENV` | Vercel / `next start` 自动为 `production`，无需手动设置 |

> 数据库连接二选一：设置 `DATABASE_URL` 即可；**或者**设置 `DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD` 也能连接，无需 `DATABASE_URL`。

## 部署
- 目标平台：Vercel（`vercel.json` 已存在，仅 `{ "version": 2 }`）。
- 构建与启动：`npm run build` → `npm run start`（生产）。本地开发用 `npm run dev`。
- 上线前必须在 Vercel 环境变量中配置数据库连接（`DATABASE_URL` 或 `DB_*` 分项变量，二选一）以及 `JWT_SECRET`。
- 对外回传地址正式域名待定，对外文档中暂用占位 `postback.example.com`。
