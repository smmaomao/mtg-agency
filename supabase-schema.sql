-- 管理后台数据库表结构
-- 请在 Supabase SQL Editor 中执行此文件
-- 注意：本文件显式使用 mtg_agency schema，不依赖数据库默认 search_path，
-- 因此在本地/线上（search_path 不同时）都能正确建表。可重复执行（幂等）。

CREATE SCHEMA IF NOT EXISTS mtg_agency;

-- 管理员用户表
CREATE TABLE IF NOT EXISTS mtg_agency.admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  real_name VARCHAR(100) DEFAULT '',
  role_id INTEGER REFERENCES mtg_agency.admin_roles(id) ON DELETE SET NULL,
  status SMALLINT DEFAULT 1, -- 1=启用 0=禁用
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 管理员角色表
CREATE TABLE IF NOT EXISTS mtg_agency.admin_roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description VARCHAR(255) DEFAULT '',
  menu_permissions INTEGER[] DEFAULT '{}', -- 允许访问的菜单ID数组
  status SMALLINT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 管理菜单表
CREATE TABLE IF NOT EXISTS mtg_agency.admin_menus (
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
INSERT INTO mtg_agency.admin_roles (id, name, description, menu_permissions)
VALUES (1, '超级管理员', '拥有所有权限', '{}')
ON CONFLICT (id) DO NOTHING;

-- 管理菜单种子数据（取自本地库现有菜单结构）
INSERT INTO mtg_agency.admin_menus (id, name, path, icon, parent_id, sort_order) VALUES
  (2, '系统管理', '', 'settings', 0, 2),
  (3, '菜单管理', '/dashboard/menus', 'menu', 2, 5),
  (4, '角色管理', '/dashboard/roles', 'shield', 2, 2),
  (5, '用户管理', '/dashboard/users', 'users', 2, 3),
  (6, '产品管理', '', 'package', 0, 3),
  (7, '客户管理', '/dashboard/customers', 'building', 6, 1),
  (8, '产品管理', '/dashboard/products', 'box', 6, 2),
  (9, '包体管理', '/dashboard/packages', 'archive', 6, 3),
  (10, '转发管理', '', 'share', 0, 4),
  (11, '包映射配置', '/dashboard/dsp-mapping', 'link', 10, 1),
  (12, '事件回传日志', '/dashboard/callback-logs', 'refresh', 10, 2),
  (13, '报表拉取日志', '/dashboard/report-logs', 'file-text', 10, 3),
  (14, '操作日志', '/dashboard/audit-logs', 'clipboard-list', 2, 10)
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
INSERT INTO mtg_agency.admin_users (username, password_hash, real_name, role_id, status)
VALUES ('admin', '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQkf9Rmy6C0FQvZgVvHOJCHfA7HOLS', '超级管理员', 1, 1)
ON CONFLICT (username) DO NOTHING;

-- ============================================================
-- 业务表（原文件缺失，以下为补全）
-- ============================================================

-- 客户管理
CREATE TABLE IF NOT EXISTS mtg_agency.customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  contact_person VARCHAR(50) DEFAULT '',
  contact_phone VARCHAR(50) DEFAULT '',
  email VARCHAR(100) DEFAULT '',
  open_date DATE,
  remark TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 产品管理（归属客户）
CREATE TABLE IF NOT EXISTS mtg_agency.products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  customer_id INTEGER REFERENCES mtg_agency.customers(id) ON DELETE RESTRICT,
  product_type VARCHAR(20) DEFAULT 'game',
  remark TEXT DEFAULT '',
  icon_url TEXT,
  description TEXT,
  countries TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 包体管理（归属产品）
CREATE TABLE IF NOT EXISTS mtg_agency.app_packages (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES mtg_agency.products(id) ON DELETE RESTRICT,
  name VARCHAR(200) NOT NULL,
  platform VARCHAR(20) DEFAULT 'android',
  version VARCHAR(50),
  download_url TEXT,
  icon_url TEXT,
  remark TEXT DEFAULT '',
  package_name VARCHAR(200),
  landing_page_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 包映射配置（包体 → DSP / 渠道，含 campuuid）
CREATE TABLE IF NOT EXISTS mtg_agency.packages_dsp_mapping (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER,
  product_id INTEGER,
  package_id INTEGER REFERENCES mtg_agency.app_packages(id) ON DELETE RESTRICT,
  dsp_name VARCHAR(100) NOT NULL,
  channel_name VARCHAR(100),
  dsp_package_id VARCHAR(200),
  campuuid VARCHAR(200),
  landing_page_url TEXT,
  status VARCHAR(20) DEFAULT 'active',
  remark TEXT DEFAULT '',
  is_pwa BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 事件回传日志
CREATE TABLE IF NOT EXISTS mtg_agency.callback_logs (
  id SERIAL PRIMARY KEY,
  mapping_id INTEGER,
  event_type VARCHAR(50),
  event_name VARCHAR(100),
  click_id VARCHAR(200),
  request_url TEXT,
  request_body TEXT,
  response_body TEXT,
  response_code INTEGER,
  response_time INTEGER,
  http_status INTEGER,
  status VARCHAR(20) DEFAULT 'pending',
  pixel_id VARCHAR(200),
  package_name VARCHAR(200),
  standard_event_code VARCHAR(100),
  ip_address VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 报表拉取日志
CREATE TABLE IF NOT EXISTS mtg_agency.report_pull_logs (
  id SERIAL PRIMARY KEY,
  mapping_id INTEGER,
  report_type VARCHAR(50) DEFAULT 'mintegral_daily',
  report_date DATE,
  pull_params TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  ip_address VARCHAR(50),
  file_count INTEGER DEFAULT 0,
  total_rows INTEGER DEFAULT 0,
  result_data TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error_message TEXT,
  callback_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 操作审计日志
CREATE TABLE IF NOT EXISTS mtg_agency.audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  username VARCHAR(100) DEFAULT '',
  action VARCHAR(20),
  target_table VARCHAR(100),
  target_id INTEGER,
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PWA 属性迁移：install 上报时是否同时上报激活(app_open)。幂等，可重复执行。
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'mtg_agency' AND table_name = 'packages_dsp_mapping' AND column_name = 'is_pwa'
  ) THEN
    ALTER TABLE mtg_agency.packages_dsp_mapping ADD COLUMN is_pwa BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;
