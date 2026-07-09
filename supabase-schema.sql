-- 管理后台数据库表结构
-- 请在 Supabase SQL Editor 中执行此文件

-- 管理员用户表
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  real_name VARCHAR(100) DEFAULT '',
  role_id INTEGER REFERENCES admin_roles(id) ON DELETE SET NULL,
  status SMALLINT DEFAULT 1, -- 1=启用 0=禁用
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 管理员角色表
CREATE TABLE IF NOT EXISTS admin_roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description VARCHAR(255) DEFAULT '',
  menu_permissions INTEGER[] DEFAULT '{}', -- 允许访问的菜单ID数组
  status SMALLINT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 管理菜单表
CREATE TABLE IF NOT EXISTS admin_menus (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  path VARCHAR(255) DEFAULT '',
  icon VARCHAR(50) DEFAULT '',
  parent_id INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建默认超级管理员角色
INSERT INTO admin_roles (id, name, description, menu_permissions)
VALUES (1, '超级管理员', '拥有所有权限', '{}')
ON CONFLICT (id) DO NOTHING;

-- 关键：显式插入 id 不会推进 SERIAL 序列，需手动将序列对齐到当前最大值，
-- 否则后续 INSERT 不指定 id 时会得到 1，与种子数据冲突。
-- 这里对 mtg_agency 下「所有」序列做统一对齐（含 admin_roles / admin_users /
-- admin_menus 等任何用显式 id 写入的 seed），作为防止主键冲突的安全网。
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname AS tbl_schema, c.relname AS tbl,
           a.attname AS col, n2.nspname AS seq_schema, s.relname AS seq
    FROM pg_depend d
    JOIN pg_class c  ON c.oid = d.refobjid
    JOIN pg_class s  ON s.oid = d.objid
    JOIN pg_namespace n  ON n.oid = c.relnamespace
    JOIN pg_namespace n2 ON n2.oid = s.relnamespace
    JOIN pg_attribute a  ON a.attrelid = c.oid AND a.attnum = d.refobjsubid
    WHERE d.deptype = 'a' AND s.relkind = 'S' AND n.nspname = 'mtg_agency'
  LOOP
    EXECUTE format(
      'SELECT setval(%L, (SELECT COALESCE(MAX(%I), 1) FROM %I.%I), true)',
      r.seq_schema || '.' || r.seq, r.col, r.tbl_schema, r.tbl
    );
  END LOOP;
END $$;

-- 创建默认管理员用户 (密码: ad123456 的 SHA-256 哈希)
-- 注意：此处使用 SHA-256，实际密码在应用层使用 bcrypt 验证
INSERT INTO admin_users (username, password_hash, real_name, role_id, status)
VALUES ('admin', '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQkf9Rmy6C0FQvZgVvHOJCHfA7HOLS', '超级管理员', 1, 1)
ON CONFLICT (username) DO NOTHING;

-- Events 回调白名单表
CREATE TABLE IF NOT EXISTS ip_whitelist (
  id SERIAL PRIMARY KEY,
  token VARCHAR(255) NOT NULL, -- 访问 Token
  name VARCHAR(255) DEFAULT '', -- 调用方名称
  remark VARCHAR(255) DEFAULT '',
  status SMALLINT DEFAULT 1, -- 1=启用 0=禁用
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_ip_whitelist_token ON ip_whitelist(token);
