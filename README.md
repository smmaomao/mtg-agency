This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## MTG Agency 部署说明

### 环境变量（Vercel 项目 Environment Variables，勾 Production）
- `DATABASE_URL` 或 `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD`（二选一，连 Supabase 事务池用 6543）
- `JWT_SECRET`（生产务必设置，否则使用可预测的 fallback 密钥）
- 不要配置 `MOCK_FORWARD`（本地跳过真实转发用，线上留着会不转发）

### 建表
在 Supabase SQL Editor 执行一次 `supabase-schema.sql`（已显式指定 `mtg_agency` schema）。
默认管理员：账号 `admin` / 密码 `ad123456`。

### 自定义域名
Vercel Settings → Domains 添加子域（如 `postback.yourdomain.com`），DNS 加 CNAME 指向 `cname.vercel-dns.com`，自动签发 SSL。无需改代码。
